import _ from 'lodash';
import { debug as d } from 'debug';
import { sub, format as dateFnsFormat } from 'date-fns';
import { Category } from '@/model/Category';
import { User } from '@/model/User';
import { UserResponse } from '@/response/user';
import { Group } from '@/model/Group';
import { GroupResponse } from '@/response/group';
import { Reply } from '@/model/Reply';
import { Ticket } from '@/model/Ticket';
import { TicketForm } from '@/model/TicketForm';
import { TicketFieldValue } from '@/model/TicketFieldValue';
import { TicketField } from '@/model/TicketField';
import { AuthOptions, Model, Query, QueryBuilder } from '@/orm';
import { categoryService } from '@/category';
import { ExportFileManager } from './ExportFileManager';
import { JobData } from '.';
import { SortItem } from '@/middleware';
import { addInOrNotExistCondition } from '@/utils/conditions';

const debug = d('export');

export interface FilterOptions {
  authorId?: string;
  assigneeId?: string[];
  categoryId?: string[];
  rootCategoryId?: string;
  product?: string;
  groupId?: string[];
  status?: number[];
  'evaluation.star'?: number;
  createdAtFrom?: string | Date;
  createdAtTo?: string | Date;
  tagKey?: string;
  tagValue?: string;
  privateTagKey?: string;
  privateTagValue?: string;
  fieldName?: string;
  fieldValue?: string;
  type?: string;
  language?: string[];
}
// copy ticket filter
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

const createBaseTicketQuery = async (params: FilterOptions, sortItems?: SortItem[]) => {
  if (params.fieldName && params.fieldValue) {
    const ticketFieldQuery = TicketFieldValue.queryBuilder()
      .where('values', '==', {
        field: params.fieldName,
        value: params.fieldValue,
      })
      .orderBy('createdAt', 'desc');

    if (params.createdAtFrom) {
      ticketFieldQuery.where('createdAt', '>=', new Date(params.createdAtFrom));
    }

    if (params.createdAtTo) {
      ticketFieldQuery.where('createdAt', '<=', new Date(params.createdAtTo));
    }

    return [ticketFieldQuery, true] as const;
  } else {
    const categoryIds = new Set(params.categoryId);
    const rootId = params.product || params.rootCategoryId;

    if (rootId) {
      categoryIds.add(rootId);
      const subCategories = await categoryService.getSubCategories(rootId);
      subCategories.forEach((c) => categoryIds.add(c.id));
    }

    const query = Ticket.queryBuilder();

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
      query.where('createdAt', '>=', new Date(params.createdAtFrom));
    }
    if (params.createdAtTo) {
      query.where('createdAt', '<=', new Date(params.createdAtTo));
    }
    if (params.tagKey) {
      query.where('tags.key', '==', params.tagKey);
    }
    if (params.tagValue) {
      query.where('tags.value', '==', params.tagValue);
    }
    if (params.privateTagKey) {
      query.where('privateTags.key', '==', params.privateTagKey);
    }
    if (params.privateTagValue) {
      query.where('privateTags.value', '==', params.privateTagValue);
    }

    if (params.language) {
      addInOrNotExistCondition(query, params.language, 'language');
    }

    sortItems?.forEach(({ key, order }) => query.orderBy(key, order));

    return [query, false] as const;
  }
};

const createTicketQuery = async (
  containField: boolean,
  query: Awaited<ReturnType<typeof createBaseTicketQuery>>[0],
  skip?: number,
  limit?: number
) => {
  if (skip !== undefined) {
    query.skip(skip);
  }

  if (limit !== undefined) {
    query.limit(limit);
  }

  if (containField) {
    const ticketIds = (
      await (query as Query<typeof TicketFieldValue>).find({ useMasterKey: true })
    ).map(({ ticketId }) => ticketId);

    return Ticket.queryBuilder().where('objectId', 'in', ticketIds).orderBy('createdAt', 'desc');
  }

  return query as Query<typeof Ticket>;
};

const currentTimezoneOffset = new Date().getTimezoneOffset();

const format = (date?: Date, utcOffset?: number) => {
  if (!date) {
    return '';
  }
  if (utcOffset === undefined) {
    return date.toISOString();
  }
  return dateFnsFormat(
    sub(date, { minutes: utcOffset - currentTimezoneOffset }),
    'yyyy-MM-dd HH:mm:ss'
  );
};

const getCategories = async (authOptions?: AuthOptions) => {
  const categories = await categoryService.find();
  return _(categories).keyBy('id').valueOf();
};

const getCategoryPath = async (category: Category) => {
  const parents = await categoryService.getParentCategories(category.id);
  return [...parents.map((c) => c.name).reverse(), category.name].join('/');
};

const getCustomerServices = async () => {
  const customerServices = await User.getCustomerServices();
  return _(customerServices)
    .map((user) => new UserResponse(user).toJSON())
    .keyBy('id')
    .valueOf();
};

const getGroups = async (authOptions?: AuthOptions) => {
  const groups = await Group.query().find(authOptions);
  return _(groups)
    .map((group) => new GroupResponse(group).toJSON())
    .keyBy('id')
    .valueOf();
};

const getReplies = async (ticketIds: string[], authOptions?: AuthOptions, utcOffset?: number) => {
  const query = Reply.queryBuilder().where(
    'ticket',
    'in',
    ticketIds.map((id) => Ticket.ptr(id))
  );
  const replies = await query.find(authOptions);
  return _(replies)
    .map((reply) => {
      return {
        id: reply.id,
        ticketId: reply.ticketId,
        content: reply.content,
        authorId: reply.authorId,
        isCustomerService: reply.isCustomerService,
        createdAt: format(reply.createdAt, utcOffset),
      };
    })
    .groupBy('ticketId')
    .valueOf();
};

const getCustomFormFieldsFunc = (authOptions?: AuthOptions) => {
  const formCacheMap = new Map<
    string,
    {
      title?: string;
      fieldIds?: string[];
    }
  >();
  const fieldCacheMap = new Map<string, string | undefined>();
  return async (fromIds: string[]) => {
    const filterFromIds = fromIds.filter((id) => !formCacheMap.has(id));
    if (filterFromIds.length > 0) {
      const forms = await TicketForm.query()
        .where('objectId', 'in', filterFromIds)
        .find(authOptions);
      const formMap = _.keyBy(forms, 'id');
      filterFromIds.forEach((id) => {
        const form = formMap[id];
        formCacheMap.set(id, {
          title: form?.title,
          fieldIds: form?.fieldIds,
        });
      });
    }
    const fieldIds = _(fromIds)
      .map((id) => formCacheMap.get(id)?.fieldIds)
      .filter((v) => v !== undefined && v.length > 0)
      .flatten()
      .uniq()
      .valueOf();
    const filterFieldIds = (fieldIds as string[]).filter((id) => !fieldCacheMap.has(id));
    if (filterFieldIds.length > 0) {
      const fields = await TicketField.queryBuilder()
        .where('objectId', 'in', filterFieldIds)
        .find({ useMasterKey: true });
      fields.forEach((field) => {
        fieldCacheMap.set(field.id, field.title);
      });
    }
    return {
      formCacheMap,
      fieldCacheMap,
    };
  };
};

const getFieldValues = async (ticketIds: string[], authOptions?: AuthOptions) => {
  const results = await TicketFieldValue.queryBuilder()
    .where(
      'ticket',
      'in',
      ticketIds.map((id) => Ticket.ptr(id))
    )
    .find(authOptions);
  return _(results)
    .map((data) => {
      return {
        ticketId: data.ticketId,
        values: data.values || [],
      };
    })
    .keyBy('ticketId')
    .valueOf();
};

const FIXED_KEYS = [
  'id',
  'nid',
  'title',
  'status',
  'assignee.id',
  'assignee.username',
  'assignee.nickname',
  'assignee.email',
  'joinedCustomerServices',
  'author.id',
  'author.username',
  'author.nickname',
  'category.id',
  'category.name',
  'category.description',
  'category.meta',
  'category.path',
  'content',
  'evaluation.star',
  'evaluation.content',
  'firstCustomerServiceReplyAt',
  'latestCustomerServiceReplyAt',
  'group.id',
  'group.name',
  'group.description',
  'metaData',
  'privateTags',
  'customForm',
  'replies',
  'language',
  'createdAt',
  'updatedAt',
];

const authOptions = { useMasterKey: true };
const limit = 20;
export default async function exportTicket({ params, sortItems, utcOffset, date }: JobData) {
  const formatDate = _.partial(format, _, utcOffset);
  const { type: fileType, ...rest } = params;
  const fileName = `ticket_${dateFnsFormat(new Date(date), 'yyMMdd_HHmmss')}.${fileType || 'json'}`;
  const exportFileManager = new ExportFileManager(fileName);
  debug('count tickets');
  const [query, containFields] = await createBaseTicketQuery(rest, sortItems);
  const count = await query.count(authOptions);
  debug('count: ', count);
  const categoryMap = await getCategories();
  const customerServiceMap = await getCustomerServices();
  const groupMap = await getGroups(authOptions);
  const getCustomFormFields = getCustomFormFieldsFunc(authOptions);
  let fieldKeys: string[] = [];

  debug('query tickets');

  for (let index = 0; index < count; index += limit) {
    const tickets = await (await createTicketQuery(containFields, query, index, limit))
      .preload('author', { authOptions })
      .find(authOptions);
    const ticketIds = tickets.map((ticket) => ticket.id);
    debug('fetch ticket details', ticketIds);
    const replyMap = await getReplies(ticketIds, authOptions, utcOffset);
    debug('replies fetched');
    const formIds = tickets
      .map((ticket) =>
        categoryMap[ticket.categoryId] ? categoryMap[ticket.categoryId].formId : undefined
      )
      .filter((id) => id !== undefined);
    const { formCacheMap, fieldCacheMap } = await getCustomFormFields(formIds as string[]);
    debug('forms fetched');
    const fieldValuesMap = await getFieldValues(ticketIds, authOptions);
    debug('form values fetched');
    for (let ticketIndex = 0; ticketIndex < tickets.length; ticketIndex++) {
      const ticket = tickets[ticketIndex];
      const assignee = ticket.assigneeId ? customerServiceMap[ticket.assigneeId] : undefined;
      const category = categoryMap[ticket.categoryId];
      const group = ticket.groupId ? groupMap[ticket.groupId] : undefined;
      const fields = fieldValuesMap[ticket.id]?.values.map(({ field, value }) => ({
        id: field,
        title: fieldCacheMap.get(field),
        value: value,
      }));
      const keys = fields?.map((field) => `field-${field.id}-${field.title}`) ?? [];
      fieldKeys = _.uniq([...fieldKeys, ...keys]);
      let customForm: {
        title?: string;
      } = {
        title: undefined,
      };
      if (category && category.formId) {
        const form = formCacheMap.get(category.formId);
        customForm = {
          title: form?.title,
        };
      }
      const data = {
        ..._.pick(ticket, FIXED_KEYS),
        assignee,
        group,
        category: {
          id: category?.id,
          name: category?.name,
          description: category?.description,
          meta: category?.meta,
          path: category ? await getCategoryPath(category) : undefined,
        },
        firstCustomerServiceReplyAt: formatDate(ticket.firstCustomerServiceReplyAt),
        latestCustomerServiceReplyAt: formatDate(ticket.latestCustomerServiceReplyAt),
        metaData:
          ticket.metaData && fileType === 'csv' ? JSON.stringify(ticket.metaData) : ticket.metaData,
        replies: (replyMap[ticket.id] || []).map((v) => _.omit(v, 'ticketId')),
        createdAt: formatDate(ticket.createdAt),
        updatedAt: formatDate(ticket.updatedAt),
        ..._.zipObject(keys, fields?.map((field) => field.value) ?? []),
      };

      debug('data assembled, writing to the file');
      await exportFileManager.append(data, [...FIXED_KEYS, ...fieldKeys]);
      debug('done writing', ticket.id);
    }
  }
  debug('all tickets processed');
  if (fileType === 'csv') {
    await exportFileManager.prepend([...FIXED_KEYS, ...fieldKeys].join(','));
  }
  return exportFileManager.done();
}
