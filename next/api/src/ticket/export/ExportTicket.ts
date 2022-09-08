import _ from 'lodash';
import { format } from 'date-fns';
import { Category } from '@/model/Category';
import { User } from '@/model/User';
import { UserSearchResult } from '@/response/user';
import { Group } from '@/model/Group';
import { GroupResponse } from '@/response/group';
import { Reply } from '@/model/Reply';
import { Ticket } from '@/model/Ticket';
import { TicketForm } from '@/model/TicketForm';
import { TicketFieldValue } from '@/model/TicketFieldValue';
import { TicketField } from '@/model/TicketField';
import { AuthOptions, Model, QueryBuilder } from '@/orm';
import { CategoryService } from '@/service/category';
import { ExportFileManager } from './ExportFileManager';
import { JobData } from '.';
import { SortItem } from '@/middleware';

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
  type?: string;
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

const createTicketQuery = async (params: FilterOptions, sortItems?: SortItem[]) => {
  const categoryIds = new Set(params.categoryId);
  const rootId = params.product || params.rootCategoryId;
  if (rootId) {
    categoryIds.add(rootId);
    const subCategories = await CategoryService.getSubCategories(rootId);
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
  sortItems?.forEach(({ key, order }) => query.orderBy(key, order));
  return query;
};

const getCategories = async (authOptions?: AuthOptions) => {
  const categories = await Category.query().find(authOptions);
  return _(categories)
    .map(({ id, name, description, meta, formId }) => ({
      id,
      name,
      description,
      meta,
      formId,
    }))
    .keyBy('id')
    .valueOf();
};

const getCustomerServices = async () => {
  const customerServices = await User.getCustomerServices();
  return _(customerServices)
    .map((user) => new UserSearchResult(user).toJSON())
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

const getReplies = async (ticketIds: string[], authOptions?: AuthOptions) => {
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
        createdAt: reply.createdAt.toISOString(),
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
  const formFieldCacheMap = new Map<string, string | undefined>();
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
    const filterFieldIds = (fieldIds as string[]).filter((id) => !formFieldCacheMap.has(id));
    if (filterFieldIds.length > 0) {
      const fields = await TicketField.queryBuilder()
        .where('objectId', 'in', filterFieldIds)
        .find({ useMasterKey: true });
      fields.forEach((field) => {
        formFieldCacheMap.set(field.id, field.title);
      });
    }
    return {
      formCacheMap,
      formFieldCacheMap,
    };
  };
};

const getCustomFormValues = async (ticketIds: string[], authOptions?: AuthOptions) => {
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

const authOptions = { useMasterKey: true };
const limit = 20;
export default async function exportTicket({ params, sortItems, date }: JobData) {
  const { type: fileType, ...rest } = params;
  const fileName = `ticket_${format(new Date(date), 'yyMMdd_HHmmss')}.${fileType || 'json'}`;
  const exportFileManager = new ExportFileManager(fileName);
  const query = await createTicketQuery(rest, sortItems);
  const count = await query.count(authOptions);
  const categoryMap = await getCategories();
  const customerServiceMap = await getCustomerServices();
  const groupMap = await getGroups(authOptions);
  const getCustomFormFields = getCustomFormFieldsFunc(authOptions);

  for (let index = 0; index < count; index += limit) {
    const tickets = await query
      .preload('author', { authOptions })
      .limit(limit)
      .skip(index)
      .find(authOptions);
    const ticketIds = tickets.map((ticket) => ticket.id);
    const replyMap = await getReplies(ticketIds, authOptions);
    const formIds = tickets
      .map((ticket) =>
        categoryMap[ticket.categoryId] ? categoryMap[ticket.categoryId].formId : undefined
      )
      .filter((id) => id !== undefined);
    const { formCacheMap, formFieldCacheMap } = await getCustomFormFields(formIds as string[]);
    const formValuesMap = await getCustomFormValues(ticketIds, authOptions);
    for (let ticketIndex = 0; ticketIndex < tickets.length; ticketIndex++) {
      const ticket = tickets[ticketIndex];
      const assignee = ticket.assigneeId ? customerServiceMap[ticket.assigneeId] : undefined;
      const author = ticket.author;
      const category = categoryMap[ticket.categoryId];
      const group = ticket.groupId ? groupMap[ticket.groupId] : undefined;
      let customFrom = {};
      if (category && category.formId) {
        const form = formCacheMap.get(category.formId);
        const formValues =
          formValuesMap[ticket.id] && formValuesMap[ticket.id].values
            ? _.keyBy(formValuesMap[ticket.id].values, 'field')
            : {};

        customFrom = {
          title: form?.title,
          fields: form?.fieldIds?.map((id) => {
            return {
              id,
              title: formFieldCacheMap.get(id),
              value: formValues[id]?.value,
            };
          }),
        };
      }
      const data = {
        id: ticket.id,
        nid: ticket.nid,
        title: ticket.title,
        status: ticket.status,
        assignee: {
          id: assignee?.id,
          username: assignee?.username,
          nickname: assignee?.nickname,
          email: assignee?.email,
        },
        author: {
          id: author?.id,
          username: author?.username,
          nickname: author?.name,
        },
        category: {
          id: category?.id,
          name: category?.name,
          description: category?.description,
          meta: category?.meta,
        },
        content: ticket.content,
        evaluation: {
          star: ticket.evaluation?.star,
          content: ticket.evaluation?.content,
        },
        firstCustomerServiceReplyAt: ticket.firstCustomerServiceReplyAt,
        latestCustomerServiceReplyAt: ticket.latestCustomerServiceReplyAt,
        group: {
          id: group?.id,
          name: group?.name,
          description: group?.description,
        },
        metaData:
          ticket.metaData && fileType === 'csv' ? JSON.stringify(ticket.metaData) : ticket.metaData,
        privateTags: ticket.privateTags,
        customFrom,
        replies: (replyMap[ticket.id] || []).map((v) => _.omit(v, 'ticketId')),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      };
      await exportFileManager.append(data);
    }
  }
  await exportFileManager.done();
}

function printMemoryUsage() {
  const info = process.memoryUsage();
  const mb = (v: number) => (v / 1024 / 1024).toFixed(2) + ' MB';
  console.log(
    'rss=%s,heapTotal=%s,heapUsed=%s',
    mb(info.rss),
    mb(info.heapTotal),
    mb(info.heapUsed)
  );
}

setInterval(printMemoryUsage, 1000);
// 489.573ms
