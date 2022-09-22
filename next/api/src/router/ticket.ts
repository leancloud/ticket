import Router from '@koa/router';
import AV from 'leancloud-storage';
import _ from 'lodash';

import { config } from '@/config';
import * as yup from '@/utils/yup';
import { auth, customerServiceOnly, include, parseRange, sort } from '@/middleware';
import { Model, QueryBuilder } from '@/orm';
import { Category } from '@/model/Category';
import { Group } from '@/model/Group';
import { OpsLogCreator } from '@/model/OpsLog';
import { Organization } from '@/model/Organization';
import { Reply } from '@/model/Reply';
import { Tag } from '@/model/Tag';
import { Ticket } from '@/model/Ticket';
import { TicketField } from '@/model/TicketField';
import { TicketFieldValue } from '@/model/TicketFieldValue';
import { User } from '@/model/User';
import { TicketResponse, TicketListItemResponse } from '@/response/ticket';
import { ReplyResponse } from '@/response/reply';
import { Vacation } from '@/model/Vacation';
import { TicketCreator, TicketUpdater, createTicketExportJob } from '@/ticket';
import { categoryService } from '@/category';
import { filterText } from '@/utils/textFilter';

const router = new Router().use(auth);

const statuses = [50, 120, 160, 220, 250, 280];

const includeSchema = yup.object({
  includeAuthor: yup.bool(),
  includeAssignee: yup.bool(),
  includeCategory: yup.bool(), // TODO
  includeGroup: yup.bool(),
  includeFiles: yup.bool(),
  includeCategoryPath: yup.bool(),
  includeUnreadCount: yup.bool(),
});

export const ticketFiltersSchema = yup.object({
  authorId: yup.string(),
  assigneeId: yup.csv(yup.string().required()),
  categoryId: yup.csv(yup.string().required()),
  rootCategoryId: yup.string(),
  product: yup.string(),
  groupId: yup.csv(yup.string().required()),
  status: yup.csv(yup.number().oneOf(statuses).required()),
  'evaluation.star': yup.number().oneOf([0, 1]),
  createdAtFrom: yup.date(),
  createdAtTo: yup.date(),
  tagKey: yup.string(),
  tagValue: yup.string(),
  privateTagKey: yup.string(),
  privateTagValue: yup.string(),

  // pagination
  page: yup.number().integer().min(1).default(1),
  pageSize: yup.number().integer().min(0).max(100).default(10),
});

const findTicketsSchema = includeSchema.concat(ticketFiltersSchema).shape({
  where: yup.object(),
  count: yup.bool().default(false),
  includeMetaKeys: yup.csv(yup.string().required()),
});

function addPointersCondition(
  query: QueryBuilder<any>,
  key: string,
  ids: string[],
  pointedModel: typeof Model
) {
  const createPointer = pointedModel.ptr.bind(pointedModel);
  query.where((query) => {
    if (ids.includes('null')) {
      query.where(key, 'not-exists');
      ids = ids.filter((id) => id !== 'null');
      if (ids.length) {
        query.orWhere(key, 'in', ids.map(createPointer));
      }
    } else {
      query.where(key, 'in', ids.map(createPointer));
    }
  });
}

router.get(
  '/',
  sort('orderBy', ['status', 'createdAt', 'updatedAt', 'latestCustomerServiceReplyAt']),
  parseRange('createdAt'),
  include,
  async (ctx) => {
    const currentUser = ctx.state.currentUser as User;
    const params = findTicketsSchema.validateSync(ctx.query);
    const sortItems = sort.get(ctx);

    const categoryIds = new Set(params.categoryId);
    const rootId = params.product || params.rootCategoryId;
    if (rootId) {
      categoryIds.add(rootId);
      const subCategories = await categoryService.getSubCategories(rootId);
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
    if (params['evaluation.star'] !== undefined) {
      query.where('evaluation.star', '==', params['evaluation.star']);
    }
    if (params.createdAtFrom) {
      query.where('createdAt', '>=', params.createdAtFrom);
    }
    if (params.createdAtTo) {
      query.where('createdAt', '<=', params.createdAtTo);
    }
    if (params.tagKey) {
      query.where('tags.key', '==', params.tagKey);
    }
    if (params.tagValue) {
      query.where('tags.value', '==', params.tagValue);
    }
    if (params.privateTagKey) {
      if (!(await currentUser.isCustomerService())) {
        ctx.throw(403);
      }
      query.where('privateTags.key', '==', params.privateTagKey);
    }
    if (params.privateTagValue) {
      if (!(await currentUser.isCustomerService())) {
        ctx.throw(403);
      }
      query.where('privateTags.value', '==', params.privateTagValue);
    }
    if (params.includeAuthor) {
      query.preload('author');
    }
    if (params.includeAssignee) {
      query.preload('assignee');
    }
    if (params.includeGroup) {
      if (!(await currentUser.isStaff())) {
        ctx.throw(403);
      }
      query.preload('group');
    }
    if (params.includeFiles) {
      query.preload('files');
    }
    if (params.includeUnreadCount) {
      query.preload('notifications', {
        onQuery: (query) => {
          return query.where('user', '==', currentUser.toPointer());
        },
      });
    }

    query.skip((params.page - 1) * params.pageSize).limit(params.pageSize);
    sortItems?.forEach(({ key, order }) => query.orderBy(key, order));

    let tickets: Ticket[];
    if (params.count) {
      const result = await query.findAndCount(currentUser.getAuthOptions());
      tickets = result[0];
      ctx.set('X-Total-Count', result[1].toString());
    } else {
      tickets = await query.find(currentUser.getAuthOptions());
    }

    if (params.includeCategoryPath) {
      await Ticket.fillCategoryPath(tickets);
    }

    ctx.body = tickets.map((ticket) =>
      new TicketListItemResponse(ticket).toJSON({
        includeMetaKeys: params.includeMetaKeys,
      })
    );
  }
);

const searchTicketParamsSchema = ticketFiltersSchema.shape({
  keyword: yup.string().required(),
});

router.get(
  '/search',
  sort('orderBy', ['status', 'createdAt', 'updatedAt']),
  parseRange('createdAt'),
  async (ctx) => {
    const currentUser = ctx.state.currentUser as User;
    const params = searchTicketParamsSchema.validateSync(ctx.query);
    const sortFields = sort.get(ctx);

    const categoryIds = new Set(params.categoryId);
    if (params.rootCategoryId) {
      categoryIds.add(params.rootCategoryId);
      const subCategories = await categoryService.getSubCategories(params.rootCategoryId);
      subCategories.forEach((c) => categoryIds.add(c.id));
    }

    const conditions = [`(title:${params.keyword} OR content:${params.keyword})`];

    const addEqCondition = (field: string, value: string | number | (string | number)[]) => {
      if (Array.isArray(value)) {
        if (value.includes('null')) {
          const nonNullValue = value.filter((v) => v !== 'null');
          if (nonNullValue.length) {
            if (nonNullValue.length === 1) {
              conditions.push(`(_missing_:${field} OR ${field}:${nonNullValue[0]})`);
            } else {
              conditions.push(`(_missing_:${field} OR ${field}:(${nonNullValue.join(' OR ')}))`);
            }
          } else {
            conditions.push(`_missing_:${field}`);
          }
        } else {
          if (value.length === 1) {
            conditions.push(`${field}:${value[0]}`);
          } else {
            conditions.push(`${field}:(${value.join(' OR ')})`);
          }
        }
      } else {
        if (value === 'null') {
          conditions.push(`_missing_:${field}`);
        } else {
          conditions.push(`${field}:${value}`);
        }
      }
    };

    if (params.authorId) {
      addEqCondition('author.objectId', params.authorId);
    }
    if (params.assigneeId) {
      addEqCondition('assignee.objectId', params.assigneeId);
    }
    if (params.groupId) {
      addEqCondition('group.objectId', params.groupId);
    }
    if (categoryIds.size) {
      addEqCondition('category.objectId', Array.from(categoryIds));
    }
    if (params.status) {
      addEqCondition('status', params.status);
    }
    if (params['evaluation.star'] !== undefined) {
      addEqCondition('evaluation.star', params['evaluation.star']);
    }
    if (params.createdAtFrom || params.createdAtTo) {
      const from = params.createdAtFrom?.toISOString() ?? '*';
      const to = params.createdAtTo?.toISOString() ?? '*';
      conditions.push(`createdAt:[${from} TO ${to}]`);
    }
    if (params.tagKey) {
      addEqCondition('tags.key', params.tagKey);
    }
    if (params.tagValue) {
      addEqCondition('tags.value', params.tagValue);
    }
    if (params.privateTagKey) {
      addEqCondition('privateTags.key', params.privateTagKey);
    }
    if (params.privateTagValue) {
      addEqCondition('privateTags.value', params.privateTagValue);
    }

    const queryString = conditions.join(' AND ');

    const searchQuery = new AV.SearchQuery('Ticket');
    searchQuery.queryString(queryString);
    sortFields?.forEach(({ key, order }) => {
      if (order === 'asc') {
        searchQuery.addAscending(key);
      } else {
        searchQuery.addDescending(key);
      }
    });
    searchQuery.skip((params.page - 1) * params.pageSize).limit(params.pageSize);

    const ticketObjects = await searchQuery.find(currentUser.getAuthOptions());
    const tickets = ticketObjects.map((o) => Ticket.fromAVObject(o as AV.Object));

    ctx.set('X-Total-Count', searchQuery.hits().toString());
    ctx.body = tickets.map((t) => new TicketListItemResponse(t));
  }
);

const exportTicketParamsSchema = ticketFiltersSchema.shape({
  type: yup.string().oneOf(['json', 'csv']).required(),
});
router.get(
  '/export',
  customerServiceOnly,
  sort('orderBy', ['status', 'createdAt', 'updatedAt']),
  parseRange('createdAt'),
  async (ctx) => {
    const currentUser = ctx.state.currentUser as User;
    if (!currentUser.email) {
      ctx.throw(400, '邮箱未设置，请前往个人设置页面进行设置');
    }
    const { page, pageSize, ...rest } = exportTicketParamsSchema.validateSync(ctx.query);
    const sortItems = sort.get(ctx);
    createTicketExportJob({
      userId: currentUser.id,
      params: rest,
      sortItems,
    });
    ctx.body = {};
  }
);

const customFieldSchema = yup.object({
  field: yup.string().required(),
  value: yup.mixed().required(), // TODO(lyw): 更严格的验证
});

const ticketDataSchema = yup.object({
  title: yup.string().trim().max(100),
  content: yup.string().trim(),
  categoryId: yup.string().required(),
  organizationId: yup.string(),
  fileIds: yup.array(yup.string().required()),
  metaData: yup.object(),
  customFields: yup.array(customFieldSchema.required()),
  appId: yup.string(), // LeanCloud app id
});

type TicketDataSchema = yup.InferType<typeof ticketDataSchema>;

async function canCreateTicket(user: User, data: TicketDataSchema): Promise<boolean> {
  if (!config.enableLeanCloudIntegration) {
    return true;
  }
  if (config.categoriesAllowDevUserSubmitTicket.includes(data.categoryId)) {
    return true;
  }
  if (await user.hasBizLeanCloudApp()) {
    return true;
  }
  if (await user.isCustomerService()) {
    return true;
  }
  return false;
}

const extractSystemFields = (
  fields?: TicketDataSchema['customFields']
): {
  title?: string;
  details?: string;
  attachments?: string[];
  customFields?: TicketDataSchema['customFields'];
} => {
  if (!fields) return {};
  return {
    title: fields.find((field) => field.field === 'title')?.value,
    details: fields.find((field) => field.field === 'details')?.value,
    attachments: fields.find((field) => field.field === 'attachments')?.value,
    customFields: fields.filter(
      (field) => !['title', 'details', 'attachments'].includes(field.field)
    ),
  };
};

router.post('/', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const data = ticketDataSchema.validateSync(ctx.request.body);

  if (!(await canCreateTicket(currentUser, data))) {
    return ctx.throw(403, 'This account is not qualified to create ticket');
  }

  const category = await Category.find(data.categoryId);
  if (!category) {
    return ctx.throw(400, `Category ${data.categoryId} is not exists`);
  }

  const { title: fieldTitle, details, attachments, customFields } = extractSystemFields(
    data.customFields
  );

  const requestOptions: Parameters<typeof filterText>[1]['requestOptions'] = {
    user_id: currentUser.username,
    nickname: currentUser.name,
    ip: ctx.ip,
  };

  const content = await filterText((data.content || details || '').trim(), { requestOptions });
  const title =
    (await filterText(data.title || fieldTitle || '', { escape: false, requestOptions })) ||
    (content ? content.split('\n')[0].slice(0, 100) : category.name);
  const fileIds = data.fileIds ?? attachments;

  const creator = new TicketCreator().setAuthor(currentUser).setTitle(title).setContent(content);

  creator.setCategory(category);

  if (data.organizationId) {
    const organization = await Organization.find(data.organizationId, currentUser.getAuthOptions());
    if (!organization) {
      return ctx.throw(400, `Organization ${data.organizationId} is not exists`);
    }
    creator.setOrganization(organization);
  }

  if (fileIds) {
    creator.setFileIds(fileIds);
  }
  if (data.metaData) {
    creator.setMetaData(data.metaData);
  }
  if (customFields) {
    // TODO: 验证 field 是否存在
    const _customFields = await Promise.all(
      customFields.map(async (field) =>
        typeof field.value === 'string'
          ? { ...field, value: await filterText(field.value, { escape: false, requestOptions }) }
          : field
      )
    );
    creator.setCustomFields(_customFields);
  }

  const ticket = await creator.create(currentUser);

  if (config.enableLeanCloudIntegration && data.appId) {
    await Tag.create({
      ACL: creator.getRawACL(),
      authorId: currentUser.id,
      ticketId: ticket.id,
      key: 'appId',
      value: data.appId,
    });
  }

  ctx.body = { id: ticket.id };
});

router.param('id', async (id, ctx, next) => {
  const currentUser = ctx.state.currentUser as User;
  ctx.state.ticket = await Ticket.findOrFail(id, currentUser.getAuthOptions());
  return next();
});

const getTicketSchema = includeSchema;

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
  const isCustomerService = await ticket.isCustomerService(currentUser);

  const updater = new TicketUpdater(ticket);

  if (data.assigneeId !== undefined) {
    if (!isCustomerService) return ctx.throw(403);
    if (data.assigneeId) {
      const vacationerIds = await Vacation.getVacationerIds();
      if (vacationerIds.includes(data.assigneeId)) {
        return ctx.throw(400, 'This customer service is in vacation');
      }
      const assignee = await User.find(data.assigneeId, { useMasterKey: true });
      if (!assignee) {
        return ctx.throw(400, `User ${data.assigneeId} is not exists`);
      }
      updater.setAssignee(assignee);
    } else {
      updater.setAssignee(null);
    }
  }

  if (data.groupId !== undefined) {
    if (!isCustomerService) return ctx.throw(403);
    if (data.groupId) {
      const group = await Group.find(data.groupId, { useMasterKey: true });
      if (!group) {
        return ctx.throw(400, `Group ${data.groupId} is not exists`);
      }
      updater.setGroup(group);
    } else {
      updater.setGroup(null);
    }
  }

  if (data.categoryId) {
    if (!isCustomerService) return ctx.throw(403);
    const category = await Category.find(data.categoryId);
    if (!category) {
      return ctx.throw(400, `Category ${data.categoryId} is not exists`);
    }
    updater.setCategory(category);
  }

  if (data.organizationId) {
    if (data.organizationId) {
      const organization = await Organization.find(data.organizationId, {
        ...currentUser.getAuthOptions(),
        useMasterKey: isCustomerService,
      });
      if (!organization) {
        return ctx.throw(400, `Organization ${data.organizationId} is not exists`);
      }
      updater.setOrganization(organization);
    } else {
      updater.setOrganization(null);
    }
  }

  if (data.tags) {
    // XXX: tags 本来是用户填写的，但从未设置过公开 tag，且已上线自定义字段，就仅开放给客服使用了
    if (!isCustomerService) return ctx.throw(403);
    updater.setTags(data.tags);
  }

  if (data.privateTags) {
    if (!isCustomerService) return ctx.throw(403);
    updater.setPrivateTags(data.privateTags);
  }

  if (data.evaluation) {
    if (currentUser.id !== ticket.authorId) {
      return ctx.throw(403, 'Only ticket author can submit evaluation');
    }
    if (!config.allowModifyEvaluation && ticket.evaluation) {
      return ctx.throw(409, 'Ticket is already evaluated');
    }
    updater.setEvaluation(data.evaluation);
  }

  await updater.update(currentUser);

  ctx.body = {};
});

const fetchRepliesParamsSchema = yup.object({
  cursor: yup.date(),
  // pagination
  page: yup.number().integer().min(1).default(1),
  pageSize: yup.number().integer().min(0).max(1000).default(100),
  count: yup.bool().default(false),
});

router.get('/:id/replies', sort('orderBy', ['createdAt']), async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const ticket = ctx.state.ticket as Ticket;
  const { cursor, page, pageSize, count } = fetchRepliesParamsSchema.validateSync(ctx.query);
  const sortItems = sort.get(ctx);
  const createdAtOrder = sortItems?.[0];
  const asc = createdAtOrder?.order !== 'desc';

  const query = Reply.queryBuilder()
    .where('ticket', '==', ticket.toPointer())
    .preload('author')
    .preload('files');
  if (cursor) {
    query.where('createdAt', asc ? '>' : '<', cursor);
  } else {
    query.skip((page - 1) * pageSize);
  }
  query.limit(pageSize);
  sortItems?.forEach(({ key, order }) => query.orderBy(key, order));

  let replies: Reply[];
  if (count) {
    const result = await query.findAndCount(currentUser.getAuthOptions());
    replies = result[0];
    ctx.set('X-Total-Count', result[1].toString());
  } else {
    replies = await query.find(currentUser.getAuthOptions());
  }
  ctx.body = replies.map((reply) => new ReplyResponse(reply));
});

const replyDataSchema = yup.object({
  content: yup.string().trim().defined(),
  fileIds: yup.array(yup.string().required()),
  internal: yup.bool(),
});

router.post('/:id/replies', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const ticket = ctx.state.ticket as Ticket;

  const data = replyDataSchema.validateSync(ctx.request.body);
  const isCustomerService = await ticket.isCustomerService(currentUser);
  const isStaff = await currentUser.isStaff();
  const isUser = !isCustomerService && !isStaff;

  if (data.internal && isUser) {
    ctx.throw(403, 'Not internal');
  }
  if (!data.internal && isStaff && !isCustomerService) {
    ctx.throw(403, 'Public reply not allowed');
  }
  if (!data.content && (!data.fileIds || data.fileIds.length === 0)) {
    ctx.throw(400, 'Content and fileIds cannot be empty at the same time');
  }

  const reply = await ticket.reply({
    author: currentUser,
    content: isCustomerService
      ? data.content
      : await filterText(data.content, {
          requestOptions: { user_id: currentUser.username, ip: ctx.ip, nickname: currentUser.name },
        }),
    fileIds: data.fileIds?.length ? data.fileIds : undefined,
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
  await ticket.operate(action as any, currentUser);
  ctx.body = {};
});

const setCustomFieldsSchema = yup.array(customFieldSchema.required()).required();

router.put('/:id/custom-fields', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const ticket = ctx.state.ticket as Ticket;
  const values = await Promise.all(
    setCustomFieldsSchema
      .validateSync(ctx.request.body)
      .map(async (field) =>
        typeof field.value === 'string'
          ? {
              ...field,
              value: await filterText(field.value, {
                escape: false,
                requestOptions: {
                  user_id: currentUser.username,
                  nickname: currentUser.name,
                  ip: ctx.ip,
                },
              }),
            }
          : field
      )
  );
  const opsLogCreator = new OpsLogCreator(ticket);

  const ticketFieldValue = await TicketFieldValue.queryBuilder()
    .where('ticket', '==', ticket.toPointer())
    .first({ useMasterKey: true });

  if (ticketFieldValue) {
    opsLogCreator.changeFields(ticketFieldValue.values, values, currentUser);
    await ticketFieldValue.update({ values }, { useMasterKey: true });
    await opsLogCreator.create();
  } else {
    opsLogCreator.changeFields([], values, currentUser);
    await TicketFieldValue.create(
      {
        ACL: {},
        ticketId: ticket.id,
        values,
      },
      { useMasterKey: true }
    );
    await opsLogCreator.create();
  }

  ctx.body = {};
});

router.get('/:id/custom-fields', async (ctx) => {
  const ticket = ctx.state.ticket as Ticket;
  const ticketFieldValue = await TicketFieldValue.queryBuilder()
    .where('ticket', '==', ticket.toPointer())
    .first({ useMasterKey: true });

  if (!ticketFieldValue) {
    ctx.body = [];
    return;
  }

  const values = ticketFieldValue.values;

  const fieldIds = values.map((v) => v.field);
  const fileFields = await TicketField.queryBuilder()
    .where('objectId', 'in', fieldIds)
    .where('type', '==', 'file')
    .find({ useMasterKey: true });

  const fieldValueByFieldId = _.keyBy(values, (v) => v.field);
  const fileIds = fileFields
    .map((field) => fieldValueByFieldId[field.id])
    .map((v) => v.value as string[])
    .flat();
  const files = await new AV.Query('_File')
    .containedIn('objectId', fileIds)
    .find({ useMasterKey: true });
  const fileById = _.keyBy(files, (f) => f.id!);

  fileFields.forEach((field) => {
    const fieldValue = fieldValueByFieldId[field.id];
    const files = (fieldValue.value as string[])
      .map((id) => fileById[id])
      .filter((file) => file !== undefined)
      .map((file) => ({
        id: file.id,
        name: file.get('name'),
        mime: file.get('mime_type'),
        url: file.get('url'),
      }));
    (fieldValue as any).files = files;
  });

  ctx.body = values;
});

const searchCustomFieldSchema = yup.object({
  q: yup.string().trim().required(),
});

router.post('/search-custom-field', customerServiceOnly, async (ctx) => {
  const { q } = searchCustomFieldSchema.validateSync(ctx.request.body);
  const searchQuery = new AV.SearchQuery('TicketFieldValue');
  searchQuery.queryString(q);
  const results = await searchQuery.limit(1000).find({ useMasterKey: true });
  if (results.length === 0) {
    ctx.body = [];
    return;
  }

  const ticketIds: string[] = results.map((t) => t.get('ticket').id);
  const tickets = await Ticket.queryBuilder()
    .where('objectId', 'in', ticketIds)
    .orderBy('createdAt', 'desc')
    .limit(results.length)
    .find({ useMasterKey: true });

  ctx.body = tickets.map((t) => new TicketListItemResponse(t));
});

export default router;
