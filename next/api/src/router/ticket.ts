import Router from '@koa/router';
import _ from 'lodash';
import UAParser from 'ua-parser-js';
import { Middleware, Context } from 'koa';
import { Ctx } from '@/common/http';

import { config } from '@/config';
import * as yup from '@/utils/yup';
import { auth, customerServiceOnly, include, parseRange, sort } from '@/middleware';
import { Model, QueryBuilder } from '@/orm';
import { Category } from '@/model/Category';
import { Group } from '@/model/Group';
import { OpsLog, OpsLogCreator } from '@/model/OpsLog';
import { Organization } from '@/model/Organization';
import { Reply } from '@/model/Reply';
import { Tag } from '@/model/Tag';
import { Ticket } from '@/model/Ticket';
import { TicketField } from '@/model/TicketField';
import { FieldValue, TicketFieldValue } from '@/model/TicketFieldValue';
import { User } from '@/model/User';
import { TicketResponse, TicketListItemResponse } from '@/response/ticket';
import { ReplyResponse } from '@/response/reply';
import { Vacation } from '@/model/Vacation';
import { TicketCreator, TicketUpdater, createTicketExportJob } from '@/ticket';
import { categoryService } from '@/category';
import { FilterOptions, textFilterService } from '@/utils/textFilter';
import { OpsLogResponse } from '@/response/ops-log';
import { getIP } from '@/utils';
import { organizationService } from '@/service/organization';
import { roleService } from '@/service/role';
import { allowedTicketLanguages } from '@/utils/locale';
import { addInOrNotExistCondition } from '@/utils/conditions';
import { dynamicContentService } from '@/dynamic-content';
import { FileResponse } from '@/response/file';
import { File } from '@/model/File';
import { lookupIp } from '@/utils/ip';
import { ticketService } from '@/service/ticket';
import { collaboratorService } from '@/service/collaborator';
import { searchTicketService } from '@/service/search-ticket';
import { redis } from '@/cache';
import crypto from 'crypto';

const router = new Router().use(auth);

const statuses = [50, 120, 160, 220, 250, 280];

const includeSchema = yup.object({
  includeAuthor: yup.bool(),
  includeReporter: yup.bool(),
  includeAssignee: yup.bool(),
  includeGroup: yup.bool(),
  includeFiles: yup.bool(),
  includeCategoryPath: yup.bool(),
  includeUnreadCount: yup.bool(),
  includeTag: yup.bool(),
  includeFields: yup.bool(),
});

export const ticketFiltersSchema = yup.object({
  authorId: yup.string(),
  assigneeId: yup.csv(yup.string().required()),
  categoryId: yup.csv(yup.string().required()),
  rootCategoryId: yup.string(),
  product: yup.string(),
  groupId: yup.csv(yup.string().required()),
  reporterId: yup.csv(yup.string().required()),
  participantId: yup.csv(yup.string().required()),
  status: yup.csv(yup.number().oneOf(statuses).required()),
  'evaluation.star': yup.number().oneOf([0, 1]),
  'evaluation.ts': yup.dateRange(),
  createdAtFrom: yup.date(),
  createdAtTo: yup.date(),
  tagKey: yup.string(),
  tagValue: yup.string(),
  privateTagKey: yup.string(),
  privateTagValue: yup.string(),
  language: yup.csv(yup.string().required()),

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
    if (params.reporterId) {
      addPointersCondition(query, 'reporter', params.reporterId, User);
    }
    if (params.participantId) {
      query.where('joinedCustomerServices.objectId', 'in', params.participantId);
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
    if (params['evaluation.ts']) {
      const [from, to] = params['evaluation.ts'];
      if (from) {
        query.where('evaluation.ts', '>=', from);
      }
      if (to) {
        query.where('evaluation.ts', '<=', to);
      }
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

    if (params.language) {
      addInOrNotExistCondition(query, params.language, 'language');
    }

    query.skip((params.page - 1) * params.pageSize).limit(params.pageSize);
    sortItems?.forEach(({ key, order }) => query.orderBy(key, order));

    if (params.includeAuthor) {
      query.preload('author');
    }
    if (params.includeReporter) {
      query.preload('reporter');
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
      query.preload('notification', {
        onQuery: (query) => {
          return query.where('user', '==', currentUser.toPointer());
        },
      });
    }
    if (params.includeFields) {
      query.preload('fieldValue', {
        authOptions: { useMasterKey: true },
      });
    }

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

const exportTicketParamsSchema = ticketFiltersSchema.shape({
  type: yup.string().oneOf(['json', 'csv']).required(),
  utcOffset: yup.number(),
});
router.get(
  '/export',
  customerServiceOnly,
  sort('orderBy', ['status', 'createdAt', 'updatedAt']),
  parseRange('createdAt'),
  async (ctx) => {
    const currentUser = ctx.state.currentUser as User;
    const { page, pageSize, utcOffset, ...rest } = exportTicketParamsSchema.validateSync(ctx.query);
    const sortItems = sort.get(ctx);
    await createTicketExportJob({
      userId: currentUser.id,
      params: rest,
      sortItems,
      utcOffset,
    });
    ctx.body = {};
  }
);

const customFieldSchema = yup.object({
  field: yup.string().required(),
  value: yup.mixed().required(), // TODO: 更严格的验证
});

const customFieldsSchema = yup
  .array(customFieldSchema.required())
  .transform((items: { value: any }[]) =>
    items.filter((item) => {
      if (typeof item.value === 'number') {
        // _.isEmpty(numberValue) => true
        return true;
      }
      return !_.isEmpty(item.value);
    })
  );

const ticketDataSchema = yup.object({
  title: yup.string().trim().max(150),
  content: yup.string().trim(),
  categoryId: yup.string().required(),
  organizationId: yup.string(),
  authorId: yup.string(),
  reporterId: yup.string(),
  fileIds: yup.array(yup.string().required()),
  metaData: yup.object(),
  customFields: customFieldsSchema,
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

const { PERSIST_USERAGENT_INFO, IP_LOOKUP_ENABLED } = process.env;

// Define constants for limits
const DAILY_TICKET_LIMIT = 20;
const DUPLICATE_CHECK_TTL_SECONDS = 120; // 2 minutes

// Middleware for Rate Limiting Ticket Creation
const ticketRateLimitMiddleware: Middleware = async (ctx: Context, next) => {
  const currentUser = ctx.state.currentUser as User;
  if (!currentUser) {
    // Should be caught by auth middleware, but check defensively
    ctx.throw(401);
    return;
  }

  // Check if the user is Customer Service
  const isCS = await currentUser.isCustomerService();

  if (!isCS && redis) {
    console.log(`[Rate Limit] Checking rate limit for non-CS user ${currentUser.id}.`);
    let currentCount = 0;
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      const redisKey = `rate_limit:ticket:create:${currentUser.id}:${today}`;
      console.log(`[Rate Limit] User: ${currentUser.id}, Date: ${today}, Key: ${redisKey}`);

      currentCount = await redis.incr(redisKey);
      console.log(`[Rate Limit] Redis INCR result for key ${redisKey}: ${currentCount}`);

      if (currentCount === 1) {
        console.log(`[Rate Limit] Setting expiry for key ${redisKey} to 86400s.`);
        // Set expiry to 24 hours when the key is first created today
        await redis.expire(redisKey, 86400); // 86400 seconds = 24 hours
      }

    } catch (error: any) {
      console.error(`[Rate Limit] Redis rate limiting check failed for user ${currentUser.id}:`, error);
      // Log error to Sentry or other monitoring
      // captureException(error, { extra: { component: 'TicketAPIV2', msg: 'Rate limit check failed', userId: currentUser.id } });
      // Fail open: If Redis fails, allow the request to proceed.
    }
    if (currentCount > DAILY_TICKET_LIMIT) {
      console.warn(`[Rate Limit] Limit exceeded for user ${currentUser.id}. Count: ${currentCount}. Denying request.`);
      ctx.throw(429, `Rate limit exceeded. You can create up to ${DAILY_TICKET_LIMIT} tickets per day.`);
      return; // Stop processing
    }
  } else if (!redis) {
    console.warn(`[Rate Limit] Redis client is not available. Skipping rate limiting check for user ${currentUser.id}.`);
  } else {
    // User is CS, skip check
    console.log(`[Rate Limit] User ${currentUser.id} is CS, skipping check.`);
  }

  // Proceed to the next middleware or handler
  await next();
};

// Middleware for Duplicate Ticket Check
const ticketDuplicateCheckMiddleware: Middleware = async (ctx: Context, next) => {
  const currentUser = ctx.state.currentUser as User;
  if (!currentUser) {
    ctx.throw(401);
    return;
  }

  // Get potential identity sources from the body
  const body = ctx.request.body as any;
  const title = body?.title;
  const customFields = body?.customFields;

  let checkType: 'title' | 'customFields' | null = null;
  let identityPayload: string | null = null;
  let payloadHash: string | null = null;
  let duplicateCheckKey: string | null = null;

  // Determine what to base the duplicate check on
  if (title && typeof title === 'string' && title.trim() !== '') {
    // Use non-empty title for check
    checkType = 'title';
    identityPayload = title; // Use the title directly for hashing
    console.log(`[Duplicate Check] Using TITLE for check: "${title}"`);
  } else if (customFields && Array.isArray(customFields) && customFields.length > 0) {
    // Fallback to custom fields if title is empty/missing and customFields exist
    checkType = 'customFields';
    try {
      // Sort by field ID for consistent hashing regardless of submission order
      const sortedFields = [...customFields].sort((a, b) => String(a?.field).localeCompare(String(b?.field)));
      identityPayload = JSON.stringify(sortedFields);
      console.log(`[Duplicate Check] Title is empty/missing. Using CUSTOM FIELDS for check. Sorted JSON: ${identityPayload}`);
    } catch (e) {
      console.error('[Duplicate Check] Error processing custom fields for hashing:', e);
      // Don't perform check if processing fails
      identityPayload = null;
      checkType = null;
    }
  } else {
    // Cannot perform check if neither title nor customFields are usable
    console.warn(`[Duplicate Check] No usable title or custom fields found for user ${currentUser.id}. Skipping check.`);
  }

  // Proceed with check only if we have a basis (checkType is set)
  if (checkType && identityPayload) {
    payloadHash = crypto.createHash('sha1').update(identityPayload).digest('hex');
    duplicateCheckKey = `duplicate_check:ticket:${currentUser.id}:${checkType}:${payloadHash}`;

    if (redis) {
      console.log(`[Duplicate Check] Redis client available. Key: ${duplicateCheckKey}, Type: ${checkType}, Hash: ${payloadHash}`);
      try {
        const existingTicketId = await redis.get(duplicateCheckKey);
        console.log(`[Duplicate Check] Redis GET result for key ${duplicateCheckKey}: ${existingTicketId}`);

        if (existingTicketId) {
          console.log(`[Duplicate Check] Duplicate ticket detected based on ${checkType} for user ${currentUser.id} with hash ${payloadHash}. Returning existing ID: ${existingTicketId}`);
          ctx.status = 200;
          ctx.body = { id: existingTicketId, duplicated: true };
          return; // Return early
        }
      } catch (error: any) {
        console.error(`[Duplicate Check] Redis GET failed for user ${currentUser.id}, key ${duplicateCheckKey}:`, error);
        // Fail open: If Redis GET fails, allow creation.
        duplicateCheckKey = null; // Prevent SET attempt later
      }
    } else {
      console.warn(`[Duplicate Check] Redis client not available. Skipping Redis GET/SET for user ${currentUser.id}.`);
      duplicateCheckKey = null; // Prevent SET attempt later
    }
  }

  // Proceed to the actual ticket creation handler
  await next();

  // ---- After ticket creation ----
  const createdTicketId = (ctx.body as any)?.id;
  const wasSuccessful = ctx.status === 200 && createdTicketId;

  // Store in Redis only if:
  // 1. Ticket creation was successful
  // 2. We successfully generated a duplicateCheckKey earlier (based on title or customFields)
  // 3. Redis client is available
  if (wasSuccessful && duplicateCheckKey && redis) {
    console.log(`[Duplicate Set] Ticket creation successful (ID: ${createdTicketId}). Storing key based on ${checkType}. Key: ${duplicateCheckKey}, TTL: ${DUPLICATE_CHECK_TTL_SECONDS}s`);
    try {
      const setResult = await redis.set(duplicateCheckKey, createdTicketId, 'EX', DUPLICATE_CHECK_TTL_SECONDS);
      console.log(`[Duplicate Set] Redis SET result for key ${duplicateCheckKey}: ${setResult}`);
    } catch (error: any) {
      console.error(`[Duplicate Set] Redis SET failed for ticket ${createdTicketId}, key ${duplicateCheckKey}:`, error);
      // Log error but don't block response
    }
  } else if (wasSuccessful && !redis) {
    console.warn(`[Duplicate Set] Redis client not available. Cannot store duplicate check key for new ticket ${createdTicketId}.`);
  } else if (wasSuccessful && !duplicateCheckKey) {
    console.warn(`[Duplicate Set] Duplicate check key was not generated/used. Cannot store for new ticket ${createdTicketId}.`);
  }
};

router.post('/',
  // Apply the new middleware BEFORE the main handler
  ticketDuplicateCheckMiddleware,
  ticketRateLimitMiddleware,
  // Original handler starts here
  async (ctx: Context) => {
  const currentUser = ctx.state.currentUser as User;
  const data = ticketDataSchema.validateSync(ctx.request.body);
  const storeUnknownField = ctx.query['storeUnknownField'];

  if (!(await canCreateTicket(currentUser, data))) {
    return ctx.throw(403, 'This account is not qualified to create ticket');
  }

  const isCS = await currentUser.isCustomerService();
  const author =
    (isCS && data.authorId ? await User.findById(data.authorId) : undefined) ?? currentUser;
  let reporter: User | undefined;
  if (isCS) {
    if (data.reporterId) {
      reporter = await User.findById(data.reporterId);
    } else if (currentUser.id !== author.id) {
      reporter = currentUser;
    }
  }

  const category = await Category.find(data.categoryId);
  if (!category) {
    return ctx.throw(400, `Category ${data.categoryId} is not exists`);
  }
  if (category.meta) {
    const { allow } = category.meta;
    if (typeof allow === 'string') {
      const systemRoles = await roleService.getSystemRolesForUser(currentUser.id);
      if (!systemRoles.includes(allow)) {
        return ctx.throw(403, `You cannot create ticket with category ${category.id}`);
      }
    }
  }

  const { title: fieldTitle, details, attachments, customFields } = extractSystemFields(
    data.customFields
  );

  const filterOptions: FilterOptions = {
    user_id: currentUser.username,
    nickname: currentUser.name,
    ip: getIP(ctx),
  };

  const { escape: content, unescape: contentWithoutEscape } = await textFilterService.filter(
    (data.content || details || '').trim(),
    filterOptions
  );
  const title =
    (await textFilterService.filter(data.title || fieldTitle || '', filterOptions)).unescape ||
    (contentWithoutEscape
      ? contentWithoutEscape.split('\n')[0].slice(0, 100)
      : await dynamicContentService.render(category.name, ctx.locales.locales));
  const fileIds = data.fileIds ?? attachments;

  const creator = new TicketCreator().setAuthor(author).setTitle(title).setContent(content);

  if (reporter) {
    creator.setReporter(reporter);
  }

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
  let builtInFields: TicketDataSchema['customFields'] = [];
  if (PERSIST_USERAGENT_INFO) {
    builtInFields.push({ field: 'ip', value: getIP(ctx) });
    const {
      device: { vendor, model },
      os: { name, version },
    } = UAParser(ctx.header['user-agent']);
    if (vendor || model) {
      builtInFields.push({ field: 'device', value: [vendor, model].join(' ') });
    }
    if (vendor) {
      builtInFields.push({ field: 'device_vendor', value: vendor });
    }
    if (name || version) {
      builtInFields.push({ field: 'os', value: [name, version].join(' ') });
    }
    if (name) {
      builtInFields.push({ field: 'os_name', value: name });
    }
  }
  const fields: TicketDataSchema['customFields'] = _.uniqBy(
    // When duplicated, the later ones will be ignored by _.uniqBy
    [...(customFields ?? []), ...builtInFields],
    'field'
  );
  if (IP_LOOKUP_ENABLED) {
    const ipField = fields.find(({ field }) => field === 'ip');
    const locationField = fields.find(({ field }) => field === 'location');
    const ispField = fields.find(({ field }) => field === 'isp');
    if (ipField && (!locationField || !ispField)) {
      const { region, city, isp } = await lookupIp(ipField.value);
      if (!locationField && region) {
        fields.push({
          field: 'location',
          value: `${region}${city ?? ''}`,
        });
      }
      if (!ispField && isp) {
        fields.push({
          field: 'isp',
          value: isp,
        });
      }
    }
  }
  if (fields.length) {
    const ticketFieldIds = fields.map((field) => field.field);
    // TODO(sdjdd): Cache result
    const ticketFields = await TicketField.queryBuilder()
      .where('objectId', 'in', ticketFieldIds)
      .find({ useMasterKey: true });
    const ticketFieldById = _.keyBy(ticketFields, (field) => field.id);
    let [filteredCustomFields, unknownCustomFields] = _.partition(
      fields,
      (field) => ticketFieldById[field.field]
    );
    if (filteredCustomFields.length) {
      filteredCustomFields = await Promise.all(
        filteredCustomFields.map(async (field) => {
          const ticketField = ticketFieldById[field.field];
          if (ticketField.meta?.disableFilter === true) return field;
          if (typeof field.value === 'string') {
            field.value = (await textFilterService.filter(field.value, filterOptions)).unescape;
          }
          return field;
        })
      );
      creator.setCustomFields(filteredCustomFields);
    }
    if (unknownCustomFields.length && storeUnknownField) {
      const metaData = unknownCustomFields.reduce((metaData, { field, value }) => {
        metaData[field] = value;
        return metaData;
      }, {} as Record<string, any>);
      creator.appendMetaData(metaData);
    }
  }

  const ticket = await creator.create(currentUser);

  if (config.enableLeanCloudIntegration && data.appId) {
    await Tag.create({
      ACL: creator.getRawACL(),
      authorId: author.id,
      ticketId: ticket.id,
      key: 'appId',
      value: data.appId,
    });
  }

  ctx.body = { id: ticket.id };
});

const NUMBERS_PATTERN = /^\d{1,20}$/;

router.param('id', async (id, ctx, next) => {
  const currentUser = ctx.state.currentUser as User;
  let ticket: Ticket | undefined;

  if (NUMBERS_PATTERN.test(id)) {
    ticket = await Ticket.queryBuilder()
      .where('nid', '==', parseInt(id))
      .first(currentUser.getAuthOptions());
  } else {
    ticket = await Ticket.find(id, currentUser.getAuthOptions());
  }

  if (!ticket) {
    ctx.throw(404, `ticket ${id} does not exist`);
  }

  ctx.state.ticket = ticket;
  return next();
});

const getTicketSchema = includeSchema;

router.get('/:ticketId', include, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const params = getTicketSchema.validateSync(ctx.query);
  const ticketId = ctx.params.ticketId;

  const query = Ticket.queryBuilder();

  if (NUMBERS_PATTERN.test(ticketId)) {
    query.where('nid', '==', parseInt(ticketId));
  } else {
    query.where('objectId', '==', ticketId);
  }

  if (params.includeAuthor) {
    query.preload('author');
  }
  if (params.includeAssignee) {
    query.preload('assignee');
  }
  if (params.includeGroup && (await currentUser.isCustomerService())) {
    query.preload('group');
  }
  if (params.includeFiles) {
    query.preload('files');
  }

  query.preload('reporter');

  const ticket = await query.first(currentUser.getAuthOptions());
  if (!ticket) {
    ctx.throw(404, `ticket ${ticketId} does not exist`);
    return;
  }
  if (params.includeCategoryPath) {
    await ticket.loadCategoryPath();
  }

  // TODO: Sentry
  ticket.resetUnreadCount(currentUser).catch(console.error);

  ctx.body = new TicketResponse(ticket).toJSON({
    includeTags: params.includeTag,
    includePrivateTags: params.includeTag && (await currentUser.isCustomerService()),
  });
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
    selections: yup.array().of(yup.string()).default([]),
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
  language: yup.string().oneOf(allowedTicketLanguages).nullable(),
  title: yup.string(),
  content: yup.string(),
});

router.patch('/:id', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const ticket = ctx.state.ticket as Ticket;
  const data = updateTicketSchema.validateSync(ctx.request.body);
  const isCustomerService = await currentUser.isCustomerService();

  const updater = new TicketUpdater(ticket);

  if (data.assigneeId !== undefined) {
    const isCollaborator = await currentUser.isCollaborator();
    if (!isCustomerService && !isCollaborator) {
      return ctx.throw(403);
    }
    if (data.assigneeId) {
      const vacationerIds = await Vacation.getVacationerIds();
      if (vacationerIds.includes(data.assigneeId)) {
        return ctx.throw(400, 'This customer service is in vacation');
      }
      const assignee = await User.find(data.assigneeId, { useMasterKey: true });
      if (!assignee) {
        return ctx.throw(400, `User ${data.assigneeId} is not exists`);
      }
      if (assignee.inactive) {
        return ctx.throw(400, `User ${data.assigneeId} is inactive`);
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

  if (data.organizationId !== undefined) {
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
    if (!(await ticketService.isTicketEvaluable(ticket))) {
      return ctx.throw(400, 'Sorry, you cannot create an evaluation in an expired ticket');
    }
    updater.setEvaluation({
      ...data.evaluation,
      content: (
        await textFilterService.filter(data.evaluation.content, {
          user_id: currentUser.username,
          ip: getIP(ctx),
          nickname: currentUser.name,
        })
      ).unescape,
      ts: new Date(),
    });
  }

  if (data.language !== undefined) {
    updater.setLanguage(data.language);
  }

  if (data.title || data.content) {
    if (!isCustomerService || currentUser.id !== ticket.authorId) {
      ctx.throw(403, 'Update title or content is not allowed');
    }
    if (data.title) {
      updater.setTitle(data.title);
    }
    if (data.content) {
      updater.setContent(data.content);
    }
  }

  await updater.update(currentUser);

  ctx.body = {};
});

interface TicketOverview {
  nid: number;
  title: string;
  content: string;
  status: number;
  latestReply?: {
    content: string;
    author: {
      id: string;
      nickname: string;
    };
    createdAt: Date;
  };
}

router.get('/:id/overview', async (ctx) => {
  const ticket = ctx.state.ticket as Ticket;

  const latestReply = await Reply.queryBuilder()
    .where('ticket', '==', ticket.toPointer())
    .where('internal', '!=', true)
    .where('deletedAt', 'not-exists')
    .preload('author')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .first({ useMasterKey: true });

  const data: TicketOverview = {
    nid: ticket.nid,
    title: ticket.title,
    content: ticket.content,
    status: ticket.status,
  };

  if (latestReply) {
    data.latestReply = {
      content: latestReply.content,
      author: {
        id: latestReply.author!.id,
        nickname: latestReply.author!.name || latestReply.author!.username,
      },
      createdAt: latestReply.createdAt,
    };
  }

  ctx.body = data;
});

const fetchRepliesParamsSchema = yup.object({
  cursor: yup.date(),
  // pagination
  page: yup.number().integer().min(1).default(1),
  pageSize: yup.number().integer().min(0).max(1000).default(100),
  count: yup.bool().default(false),
});

router.get('/:id/replies', sort('orderBy', ['createdAt']), async (ctx) => {
  // TODO: 不要再添加逻辑了, 使用 TicketService.getReplies

  const ticket = ctx.state.ticket as Ticket;
  const currentUser = ctx.state.currentUser as User;
  const { cursor, page, pageSize, count } = fetchRepliesParamsSchema.validateSync(ctx.query);
  const sortItems = sort.get(ctx);
  const createdAtOrder = sortItems?.[0];
  const asc = createdAtOrder?.order !== 'desc';

  const systemRoles = await roleService.getSystemRolesForUser(currentUser.id);
  const isEndUser = systemRoles.length === 0;

  const query = Reply.queryBuilder()
    .where('ticket', '==', ticket.toPointer())
    .preload('author')
    .preload('files');

  if (isEndUser) {
    query.where((query) => {
      query.where('internal', 'not-exists').orWhere('internal', '==', false);
    });
  }
  if (isEndUser || !ctx.query.deleted) {
    query.where('deletedAt', 'not-exists');
  }

  if (cursor) {
    query.where('createdAt', asc ? '>' : '<', cursor);
  } else {
    query.skip((page - 1) * pageSize);
  }
  query.limit(pageSize);
  sortItems?.forEach(({ key, order }) => query.orderBy(key, order));

  let replies: Reply[];
  if (count) {
    const result = await query.findAndCount({ useMasterKey: true });
    replies = result[0];
    ctx.set('X-Total-Count', result[1].toString());
  } else {
    replies = await query.find({ useMasterKey: true });
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

  const serveStart = performance.now();

  console.log("POST replies", ticket.id, new Date())

  const data = replyDataSchema.validateSync(ctx.request.body);

  const isCustomerService = await currentUser.isCustomerService();
  const isStaff = await currentUser.isStaff();
  const isCollaborator = await currentUser.isCollaborator();

  const canCreatePublicReply = async () => {
    if (currentUser.id === ticket.authorId) {
      return true;
    }
    if (isCustomerService) {
      return true;
    }
    if (isCollaborator) {
      const privileges = await collaboratorService.getPrivileges();
      if (privileges?.createPublicReply) {
        return true;
      }
    }
    if (ticket.organizationId) {
      return organizationService.isOrganizationMember(ticket.organizationId, currentUser.id);
    }
    return false;
  };

  if (data.internal) {
    if (!isStaff && !isCollaborator) {
      delete data.internal;
    }
  } else {
    if (!(await canCreatePublicReply())) {
      ctx.throw(403, 'Public reply not allowed');
    }
  }

  if (!data.content && (!data.fileIds || data.fileIds.length === 0)) {
    ctx.throw(400, 'Content and fileIds cannot be empty at the same time');
  }

  const validateEnd = performance.now();

  console.log("POST replies (before reply)", ticket.id, new Date(), validateEnd - serveStart)

  const content = isCustomerService
    ? data.content
    : (
      await textFilterService.filter(data.content, {
        user_id: currentUser.username,
        ip: getIP(ctx),
        nickname: currentUser.name,
      })
    ).escape

  const textFilterEnd = performance.now();
  console.log("POST replies (text-filter)", ticket.id, new Date(), textFilterEnd - validateEnd)

  const reply = await ticket.reply({
    author: currentUser,
    content: content,
    fileIds: data.fileIds?.length ? data.fileIds : undefined,
    internal: data.internal,
  });

  const replyEnd = performance.now();
  console.log("POST replies (after reply)", ticket.id, new Date(), replyEnd - textFilterEnd)

  ctx.body = new ReplyResponse(reply);
});

const fetchOpsLogsParamsSchema = yup.object({
  cursor: yup.date(),
  // pagination
  page: yup.number().integer().min(1).default(1),
  pageSize: yup.number().integer().min(0).max(1000).default(100),
  count: yup.bool().default(false),
});

router.get('/:id/ops-logs', sort('orderBy', ['createdAt']), async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const ticket = ctx.state.ticket as Ticket;
  const { cursor, page, pageSize, count } = fetchOpsLogsParamsSchema.validateSync(ctx.query);
  const sortItems = sort.get(ctx);
  const createdAtOrder = sortItems?.[0];
  const asc = createdAtOrder?.order !== 'desc';

  const query = OpsLog.queryBuilder().where('ticket', '==', ticket.toPointer());
  if (cursor) {
    query.where('createdAt', asc ? '>' : '<', cursor);
  } else {
    query.skip((page - 1) * pageSize);
  }
  query.limit(pageSize);
  sortItems?.forEach(({ key, order }) => query.orderBy(key, order));

  let logs: OpsLog[];
  if (count) {
    const result = await query.findAndCount(currentUser.getAuthOptions());
    logs = result[0];
    ctx.set('X-Total-Count', result[1].toString());
  } else {
    logs = await query.find(currentUser.getAuthOptions());
  }
  ctx.body = logs.map((log) => new OpsLogResponse(log));
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
  await ticket.operate(action as any, currentUser, {
    cascade: true,
  });
  ctx.body = {};
});

const setCustomFieldsSchema = customFieldsSchema.required();

router.put('/:id/custom-fields', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const ticket = ctx.state.ticket as Ticket;

  let values = setCustomFieldsSchema.validateSync(ctx.request.body);
  if (values.length) {
    const ticketFieldIds = values.map((field) => field.field);
    // TODO(sdjdd): Cache result
    const ticketFields = await TicketField.queryBuilder()
      .where('objectId', 'in', ticketFieldIds)
      .find({ useMasterKey: true });
    const ticketFieldById = _.keyBy(ticketFields, (field) => field.id);
    values = values.filter((field) => ticketFieldById[field.field]);
    if (values.length) {
      const requestOptions = {
        user_id: currentUser.username,
        nickname: currentUser.name,
        ip: getIP(ctx),
      };
      values = await Promise.all(
        values.map(async (field) => {
          const ticketField = ticketFieldById[field.field];
          if (ticketField.meta?.disableFilter === true) return field;
          if (typeof field.value === 'string') {
            field.value = (await textFilterService.filter(field.value, requestOptions)).unescape;
          }
          return field;
        })
      );
    }
  }

  const opsLogCreator = new OpsLogCreator(ticket);

  const ticketFieldValue = await TicketFieldValue.queryBuilder()
    .where('ticket', '==', ticket.toPointer())
    .first({ useMasterKey: true });

  if (ticketFieldValue) {
    const from = _.intersectionWith(ticketFieldValue.values, values, (oldValue, newValue) => {
      return oldValue.field === newValue.field;
    });
    opsLogCreator.changeFields(from, values, currentUser);
    const newValues = Object.values({
      ..._.keyBy(ticketFieldValue.values, (v) => v.field),
      ..._.keyBy(values, (v) => v.field),
    });
    await ticketFieldValue.update({ values: newValues }, { useMasterKey: true });
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

  searchTicketService.addSyncJob([ticket.id]);

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

  const values: (FieldValue & { files?: any[] })[] = ticketFieldValue.values;

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
  const files = await File.queryBuilder()
    .where('objectId', 'in', fileIds)
    .find({ useMasterKey: true });
  const fileById = _.keyBy(files, (f) => f.id!);

  fileFields.forEach((field) => {
    const fieldValue = fieldValueByFieldId[field.id];
    if (!fieldValue) return;
    const files = _.castArray(fieldValue.value)
      .map((id) => fileById[id])
      .filter(Boolean)
      .map((file) => new FileResponse(file));
    fieldValue.files = files;
  });

  ctx.body = values;
});

export default router;
