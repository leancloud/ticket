import Router from '@koa/router';
import _ from 'lodash';

import { config } from '../config';
import * as yup from '../utils/yup';
import { SortItem, auth, include, parseRange, sort } from '../middleware';
import { CreateData, Model, QueryBuilder, UpdateData } from '../orm';
import { Category, CategoryManager } from '../model/Category';
import { Group } from '../model/Group';
import { Organization } from '../model/Organization';
import { Reply } from '../model/Reply';
import { Ticket } from '../model/Ticket';
import { TicketFieldValue } from '../model/TicketFieldValue';
import { User } from '../model/User';
import { TicketResponse, TicketListItemResponse } from '../response/ticket';
import { ReplyResponse } from '../response/reply';
import { Vacation } from '../model/Vacation';

const router = new Router().use(auth);

const statuses = [50, 120, 160, 220, 250, 280];

const includeSchema = {
  includeAuthor: yup.bool(),
  includeAssignee: yup.bool(),
  includeCategory: yup.bool(), // TODO
  includeGroup: yup.bool(),
  includeFiles: yup.bool(),
  includeCategoryPath: yup.bool(),
};

const findTicketsSchema = yup.object({
  where: yup.object(),
  authorId: yup.string(),
  assigneeId: yup.csv(yup.string().required()),
  categoryId: yup.csv(yup.string().required()),
  rootCategoryId: yup.string(),
  groupId: yup.csv(yup.string().required()),
  status: yup.csv(yup.number().oneOf(statuses).required()),
  'evaluation.star': yup.number().oneOf([0, 1]),
  createdAtFrom: yup.date(),
  createdAtTo: yup.date(),
  page: yup.number().min(1).default(1),
  pageSize: yup.number().min(0).max(100).default(10),
  count: yup.bool().default(false),
  ...includeSchema,
});

function addPointersCondition(
  query: QueryBuilder<any>,
  key: string,
  ids: string[],
  pointedModel: typeof Model
) {
  const createPointer = pointedModel.ptr.bind(pointedModel);
  if (ids.includes('null')) {
    query.where(key, 'not-exists');
    ids = ids.filter((id) => id !== 'null');
    if (ids.length) {
      query.orWhere(key, 'in', ids.map(createPointer));
    }
  } else {
    query.where(key, 'in', ids.map(createPointer));
  }
}

router.get(
  '/',
  sort('orderBy', ['status', 'createdAt', 'updatedAt']),
  parseRange('createdAt'),
  include,
  async (ctx) => {
    const currentUser = ctx.state.currentUser as User;
    const params = findTicketsSchema.validateSync(ctx.query);
    const sort = ctx.state.sort as SortItem[] | undefined;

    const categoryIds = new Set(params.categoryId);
    if (params.rootCategoryId) {
      categoryIds.add(params.rootCategoryId);
      const subCategories = await CategoryManager.getSubCategories(params.rootCategoryId);
      subCategories.forEach((c) => categoryIds.add(c.id));
    }

    const query = Ticket.queryBuilder();
    if (params.where) {
      query.setRawCondition(params.where);
    }
    if (params.authorId) {
      query.where('author', '==', User.ptr(params.authorId));
    }
    if (params.assigneeId) {
      addPointersCondition(query, 'assignee', params.assigneeId, User);
    }
    if (params.groupId) {
      addPointersCondition(query, 'group', params.groupId, Group);
    }
    if (categoryIds.size) {
      query.where('category.objectId', 'in', Array.from(categoryIds));
    }
    if (params.status) {
      query.where('status', 'in', params.status);
    }
    if (params['evaluation.star']) {
      query.where('evaluation.star', '==', params['evaluation.star']);
    }
    if (params.createdAtFrom) {
      query.where('createdAt', '>=', params.createdAtFrom);
    }
    if (params.createdAtTo) {
      query.where('createdAt', '<=', params.createdAtTo);
    }
    if (sort) {
      sort.forEach(({ key, order }) => query.orderBy(key, order));
    }
    if (params.includeAuthor) {
      query.preload('author');
    }
    if (params.includeAssignee) {
      query.preload('assignee');
    }
    if (params.includeGroup) {
      if (!(await currentUser.isCustomerService())) {
        ctx.throw(403);
      }
      query.preload('group');
    }
    if (params.includeFiles) {
      query.preload('files');
    }

    query
      .preload('notification', {
        onQuery: (query) => query.where('user', '==', currentUser.toPointer()),
      })
      .skip((params.page - 1) * params.pageSize)
      .limit(params.pageSize);

    let tickets: Ticket[];
    if (params.count) {
      const result = await query.findAndCount(currentUser.getAuthOptions());
      tickets = result[0];
      ctx.set('X-Total-Count', result[1].toString());
      ctx.set('Access-Control-Expose-Headers', 'X-Total-Count');
    } else {
      tickets = await query.find(currentUser.getAuthOptions());
    }

    if (params.includeCategoryPath) {
      await Promise.all(tickets.map((ticket) => ticket.loadCategoryPath()));
    }

    ctx.body = tickets.map((ticket) => new TicketListItemResponse(ticket).toJSON());
  }
);

const customFieldSchema = yup.object({
  field: yup.string().required(),
  value: yup.mixed().required(), // TODO(lyw): 更严格的验证
});

const ticketDataSchema = yup.object({
  title: yup.string().trim().max(100).required(),
  content: yup.string().trim().required(),
  categoryId: yup.string().required(),
  organizationId: yup.string(),
  fileIds: yup.array(yup.string().required()).min(1),
  metaData: yup.object(),
  customFields: yup.array(customFieldSchema.required()),
});

router.post('/', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  if (!(await currentUser.canCreateTicket())) {
    ctx.throw(403, 'Your account is not qualified to create ticket.');
  }

  const data = ticketDataSchema.validateSync(ctx.request.body);
  const createData: CreateData<Ticket> = {
    author: currentUser, // 避免后续重复获取
    authorId: currentUser.id,
    title: data.title,
    content: data.content,
    fileIds: data.fileIds,
    metaData: data.metaData,
  };

  const category = await Category.find(data.categoryId);
  if (!category) {
    ctx.throw(400, `Category(${data.categoryId}) is not exists`);
  }
  createData.category = category;

  if (data.organizationId) {
    const organization = await Organization.find(data.organizationId, currentUser);
    if (!organization) {
      ctx.throw(400, `Organization(${data.organizationId}) is not exists`);
    }
    createData.organizationId = organization!.id;
  }

  const ticket = await Ticket.create(createData, { currentUser });

  if (data.customFields) {
    await TicketFieldValue.create(
      {
        ACL: {},
        ticketId: ticket.id,
        values: data.customFields,
      },
      { useMasterKey: true }
    );
  }

  ctx.body = { id: ticket.id };
});

router.param('id', async (id, ctx, next) => {
  const currentUser = ctx.state.currentUser as User;
  ctx.state.ticket = await Ticket.findOrFail(id, currentUser.getAuthOptions());
  return next();
});

const getTicketSchema = yup.object({ ...includeSchema });

router.get('/:id', include, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const params = getTicketSchema.validateSync(ctx.query);

  const query = Ticket.queryBuilder().where('objectId', '==', ctx.params.id);
  if (params.includeAuthor) {
    query.preload('author');
  }
  if (params.includeAssignee) {
    query.preload('assignee');
  }
  if (params.includeGroup) {
    if (!(await currentUser.isCustomerService())) {
      ctx.throw(403);
    }
    query.preload('group');
  }
  if (params.includeFiles) {
    query.preload('files');
  }

  const ticket = await query.first(currentUser.getAuthOptions());
  if (!ticket) {
    ctx.throw(404);
    return;
  }
  if (params.includeCategoryPath) {
    await ticket.loadCategoryPath();
  }

  // TODO: Sentry
  ticket.resetUnreadCount(currentUser).catch(console.error);

  ctx.body = new TicketResponse(ticket);
});

const ticketTagSchema = yup
  .object({
    key: yup.string().required(),
    value: yup.string().required(),
  })
  .noUnknown();

const ticketEvaluationSchema = yup
  .object({
    star: yup.number().oneOf([0, 1]).required(),
    content: yup.string().default(''),
  })
  .noUnknown();

const updateTicketSchema = yup.object({
  assigneeId: yup.string().nullable(),
  groupId: yup.string().nullable(),
  categoryId: yup.string(),
  organizationId: yup.string().nullable(),
  tags: yup.array(ticketTagSchema.required()),
  privateTags: yup.array(ticketTagSchema.required()),
  evaluation: ticketEvaluationSchema.default(undefined),
});

router.patch('/:id', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const ticket = ctx.state.ticket as Ticket;
  const data = updateTicketSchema.validateSync(ctx.request.body);
  const isCustomerService = await isCustomerServiceInTicket(currentUser, ticket);

  const updateData: UpdateData<Ticket> = {};

  if (data.assigneeId !== undefined) {
    if (!isCustomerService) {
      ctx.throw(403);
    }
    if (data.assigneeId) {
      const vacationerIds = await Vacation.getVacationerIds();
      if (vacationerIds.includes(data.assigneeId)) {
        ctx.throw(400, 'Sorry, this customer service is in vacation.');
      }
      const assignee = await User.find(data.assigneeId, { useMasterKey: true });
      if (!assignee) {
        ctx.throw(400, `User(${data.assigneeId}) is not exists`);
      }
      updateData.assignee = assignee;
    }
    updateData.assigneeId = data.assigneeId;
  }

  if (data.groupId !== undefined) {
    if (!isCustomerService) {
      ctx.throw(403);
    }
    if (data.groupId) {
      const group = await Group.find(data.groupId, { useMasterKey: true });
      if (!group) {
        ctx.throw(400, `Group(${data.groupId}) is not exists`);
      }
      updateData.group = group;
    }
    updateData.groupId = data.groupId;
  }

  if (data.categoryId) {
    if (!isCustomerService) {
      ctx.throw(403);
    }
    const category = await Category.find(data.categoryId);
    if (!category) {
      ctx.throw(400, `Category(${data.categoryId}) is not exists`);
    }
    updateData.category = category;
  }

  if (data.organizationId !== undefined) {
    if (data.organizationId) {
      const organization = await Organization.find(
        data.organizationId,
        isCustomerService ? { useMasterKey: true } : currentUser
      );
      if (!organization) {
        ctx.throw(400, `Organization(${data.organizationId}) is not exists`);
      }
    }
    updateData.organizationId = data.organizationId;
  }

  if (data.tags) {
    // XXX: tags 本来是用户填写的，但从未设置过公开 tag，且已上线自定义字段，就仅开放给客服使用了
    if (!isCustomerService) {
      ctx.throw(403);
    }
    updateData.tags = data.tags;
  }

  if (data.privateTags) {
    if (!isCustomerService) {
      ctx.throw(403);
    }
    updateData.privateTags = data.privateTags;
  }

  if (data.evaluation) {
    if (currentUser.id !== ticket.authorId) {
      ctx.throw(403, 'Only ticket author can submit evaluation');
    }
    if (!config.allowModifyEvaluation && ticket.evaluation) {
      ctx.throw(409, 'Evaluation already exists');
    }
    updateData.evaluation = data.evaluation;
  }

  if (!_.isEmpty(updateData)) {
    await ticket.update(updateData, { currentUser });
  }

  ctx.body = {};
});

router.get('/:id/replies', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const ticket = ctx.state.ticket as Ticket;
  const query = Reply.queryBuilder()
    .where('ticket', '==', ticket.toPointer())
    .preload('author')
    .preload('files');
  const replies = await query.find(currentUser.getAuthOptions());
  ctx.body = replies.map((reply) => new ReplyResponse(reply));
});

const replyDataSchema = yup.object({
  content: yup.string().trim().required(),
  fileIds: yup.array(yup.string().required()).min(1),
  internal: yup.bool(),
});

router.post('/:id/replies', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const ticket = ctx.state.ticket as Ticket;

  const data = replyDataSchema.validateSync(ctx.request.body);
  const isCustomerService = await isCustomerServiceInTicket(currentUser, ticket);

  if (data.internal && !isCustomerService) {
    ctx.throw(403);
  }

  const reply = await ticket.reply({
    author: currentUser,
    content: data.content,
    isCustomerService,
    fileIds: data.fileIds,
    internal: data.internal,
  });

  ctx.body = new ReplyResponse(reply);
});

const operateSchema = yup.object({
  action: yup
    .string()
    .oneOf(['replyWithNoContent', 'replySoon', 'resolve', 'close', 'reopen'])
    .required(),
});

router.post('/:id/operate', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const ticket = ctx.state.ticket as Ticket;
  const { action } = operateSchema.validateSync(ctx.request.body);
  const isCustomerService = await isCustomerServiceInTicket(currentUser, ticket);
  await ticket.operate(action as any, currentUser, isCustomerService);
  ctx.body = {};
});

async function isCustomerServiceInTicket(user: User, ticket: Ticket): Promise<boolean> {
  if (user.id === ticket.authorId) {
    return false;
  }
  return user.isCustomerService();
}

export default router;
