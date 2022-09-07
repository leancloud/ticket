import _ from 'lodash';
import { format } from 'date-fns';
import { Category } from '@/model/Category';
import { User } from '@/model/User';
import { UserSearchResult } from '@/response/user';
import { TicketResponse } from '@/response/ticket';
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

const getCategory = async (id: string, authOptions?: AuthOptions) => {
  const category = await Category.find(id, authOptions);
  if (!category) {
    return { id };
  }
  const { name, description, meta, deletedAt, formId } = category;
  return {
    id,
    active: !deletedAt,
    name,
    description,
    meta,
    formId,
  };
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

const getReplies = async (ticketId: string, authOptions?: AuthOptions) => {
  const query = Reply.queryBuilder().where('ticket', '==', Ticket.ptr(ticketId));
  query.limit(100);
  const replies = await query.find(authOptions);
  return replies.map((reply) => {
    const { id, content, authorId, isCustomerService, createdAt } = reply;
    return { id, content, authorId, isCustomerService, createdAt: createdAt.toISOString() };
  });
};

const getCustomFormFieldsFun = (authOptions?: AuthOptions) => {
  const formCacheMap = new Map<string, string[]>();
  const formFieldCacheMap = new Map<string, string | undefined>();
  const getFormFieldIds = async (fromId: string) => {
    const cacheForm = formCacheMap.get(fromId);
    if (cacheForm) {
      return cacheForm;
    }
    const form = await TicketForm.find(fromId, authOptions);
    if (!form) {
      return;
    }
    const { fieldIds } = form;
    formCacheMap.set(fromId, fieldIds);
    return fieldIds;
  };

  const getFormFields = async (fieldIds: string[]) => {
    const reqIds = fieldIds.filter((id) => !formFieldCacheMap.get(id));
    if (reqIds.length > 0) {
      const fields = await TicketField.queryBuilder()
        .where('objectId', 'in', fieldIds)
        .find({ useMasterKey: true });
      fields.forEach((field) => {
        formFieldCacheMap.set(field.id, field.title);
      });
    }
    return fieldIds.map((id) => ({
      id,
      title: formFieldCacheMap.get(id),
    }));
  };

  return async (fromId?: string) => {
    if (!fromId) {
      return;
    }
    const ids = await getFormFieldIds(fromId);
    if (!ids || ids.length === 0) {
      return;
    }
    return getFormFields(ids.filter((id) => id !== 'title'));
  };
};

const getCustomFormValues = async (
  ticketId: string,
  authOptions?: AuthOptions
): Promise<Record<string, any>> => {
  const results = await TicketFieldValue.queryBuilder()
    .where('ticket', '==', Ticket.ptr(ticketId))
    .find(authOptions);
  return _(results)
    .map((data) => data.values)
    .flatten()
    .keyBy('field')
    .mapValues('value')
    .valueOf();
};

const authOptions = { useMasterKey: true };
const limit = 100;
export default async function exportTicket({ params, sortItems, date }: JobData) {
  const { type: fileType, ...rest } = params;
  const fileName = `ticket_${format(new Date(date), 'yyMMdd_HHmmss')}.${fileType || 'json'}`;
  const exportFileManager = new ExportFileManager(fileName);
  const query = await createTicketQuery(rest, sortItems);
  const count = await query.count(authOptions);
  const getCustomFormFields = getCustomFormFieldsFun(authOptions);
  const customerServices = await getCustomerServices();
  const groups = await getGroups(authOptions);

  for (let index = 0; index < count; index += limit) {
    const tickets = await query
      .preload('author', { authOptions })
      .limit(limit)
      .skip(index)
      .find(authOptions);
    for (let ticketIndex = 0; ticketIndex < tickets.length; ticketIndex++) {
      const ticket = tickets[ticketIndex];
      const ticketResponse = new TicketResponse(ticket).toJSON();
      const {
        assigneeId,
        assignee,
        authorId,
        author,
        categoryId,
        categoryPath,
        groupId,
        group,
        files,
        contentSafeHTML,
        ...rest
      } = ticketResponse;
      const category = await getCategory(categoryId, authOptions);
      const replies = await getReplies(ticket.id, authOptions);
      const formFields = await getCustomFormFields(category.formId);
      const formValues = await getCustomFormValues(ticket.id, authOptions);
      const data = {
        ...rest,
        author: author?.toJSON(),
        assignee: assigneeId
          ? customerServices[assigneeId] || {
              id: assigneeId,
            }
          : undefined,
        category: _.omit(category, 'formId'),
        content: ticket.content,
        group: groupId
          ? groups[groupId] || {
              id: groupId,
            }
          : undefined,
        metaData: ticket.metaData,
        replies,
        customFields: formFields?.map((field) => ({
          ...field,
          value: formValues[field.id],
        })),
      };
      await exportFileManager.append(data);
    }
  }
  return exportFileManager.done();
}
