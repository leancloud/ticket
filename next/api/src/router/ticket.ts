import Router from '@koa/router';
import _ from 'lodash';

import * as yup from '../utils/yup';
import { SortItem, auth, include, parseRange, sort } from '../middleware';
import { Model, QueryBuilder } from '../orm';
import { Category, CategoryManager } from '../model/Category';
import { Group } from '../model/Group';
import { Organization } from '../model/Organization';
import { Reply } from '../model/Reply';
import { Ticket } from '../model/Ticket';
import { TicketFieldValue } from '../model/TicketFieldValue';
import { User } from '../model/User';
import { TicketResponse, TicketListItemResponse } from '../response/ticket';
import { ReplyResponse } from '../response/reply';

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
  title: yup.string().trim().min(1).max(100).required(),
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
  const [category, organization] = await Promise.all([
    Category.findOrFail(data.categoryId),
    data.organizationId ? Organization.findOrFail(data.organizationId) : undefined,
  ]);

  const ticket = await Ticket.createTicket({
    title: data.title,
    content: data.content,
    author: currentUser,
    category,
    organization,
    fileIds: data.fileIds,
    metaData: data.metaData,
  });

  if (data.customFields) {
    await TicketFieldValue.create(
      {
        ACL: {},
        ticketId: ticket.id,
        values: data.customFields,
      },
      {
        useMasterKey: true,
      }
    );
  }

  // TODO: 可以返回全部数据
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
    content: data.content,
    author: currentUser,
    isCustomerService,
    fileIds: data.fileIds,
    internal: data.internal,
  });

  ctx.body = new ReplyResponse(reply);
});

async function isCustomerServiceInTicket(user: User, ticket: Ticket): Promise<boolean> {
  if (user.id === ticket.authorId) {
    return false;
  }
  return user.isCustomerService();
}

export default router;
