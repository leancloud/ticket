import fs from 'node:fs/promises';
import { pipeline, finished } from 'node:stream/promises';
import { WritableStreamBuffer } from 'stream-buffers';
import AV from 'leancloud-storage';
import throat from 'throat';
import _ from 'lodash';
import { sub, format as dateFnsFormat, differenceInSeconds } from 'date-fns';
import { Category } from '@/model/Category';
import { User } from '@/model/User';
import { Group } from '@/model/Group';
import { Reply } from '@/model/Reply';
import { Ticket } from '@/model/Ticket';
import { TicketForm } from '@/model/TicketForm';
import { TicketFieldValue } from '@/model/TicketFieldValue';
import { TicketField } from '@/model/TicketField';
import { AuthOptions, Model, Query, QueryBuilder } from '@/orm';
import { categoryService } from '@/category';
import { JobData } from '.';
import { SortItem } from '@/middleware';
import { addInOrNotExistCondition } from '@/utils/conditions';
import { CsvTransform, JsonTransform, createCompressStream } from './ExportStream';

export interface FilterOptions {
  authorId?: string;
  assigneeId?: string[];
  categoryId?: string[];
  rootCategoryId?: string;
  product?: string;
  groupId?: string[];
  status?: number[];
  'evaluation.star'?: number;
  'evaluation.ts'?: (Date | string | undefined | null)[];
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
    if (params['evaluation.ts']) {
      const [from, to] = params['evaluation.ts'];
      if (from) {
        query.where('evaluation.ts', '>=', new Date(from));
      }
      if (to) {
        query.where('evaluation.ts', '<=', new Date(to));
      }
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

const getCategories = async () => {
  const categories = await categoryService.find();
  return _.keyBy(categories, (c) => c.id);
};

const getCategoryPath = async (category: Category) => {
  const parents = await categoryService.getParentCategories(category.id);
  return [...parents.map((c) => c.name).reverse(), category.name].join('/');
};

const encodeUser = (user: User) => {
  return {
    id: user.id,
    username: user.username,
    nickname: user.name ?? user.username,
    email: user.email,
  };
};

const encodeGroup = (group: Group) => {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
  };
};

const getReplies = async (ticketIds: string[]) => {
  const getOneTicketReplies = (ticketId: string) => {
    return Reply.queryBuilder()
      .where('ticket', '==', Ticket.ptr(ticketId))
      .limit(100)
      .find({ useMasterKey: true });
  };
  const tasks = ticketIds.map(throat(3, getOneTicketReplies));
  const repliesList = await Promise.all(tasks);
  return _.zipObject(ticketIds, repliesList);
};

interface FirstReplyInfo {
  firstReplyTime?: {
    seconds: number;
  };
  firstReplyCustomerService?: ReturnType<typeof encodeUser>;
}

const getFirstReplyInfo = async (tickets: Ticket[], replyMap: Record<string, Reply[]>) => {
  const customerServiceIds = _(replyMap)
    .values()
    .flatten()
    .filter((r) => r.isCustomerService && !r.internal)
    .map((r) => r.authorId)
    .uniq()
    .value();

  const users = await User.queryBuilder()
    .where('objectId', 'in', customerServiceIds)
    .find({ useMasterKey: true });

  const userById = _.keyBy(users, (u) => u.id);

  return tickets.reduce<Record<string, FirstReplyInfo>>((map, ticket) => {
    const info: FirstReplyInfo = {};
    const replies = replyMap[ticket.id];
    if (replies) {
      const firstReply = replies.find((r) => r.isCustomerService && !r.internal);
      if (firstReply) {
        info.firstReplyTime = {
          seconds: differenceInSeconds(firstReply.createdAt, ticket.createdAt),
        };
        const firstReplyCustomerService = userById[firstReply.authorId];
        if (firstReplyCustomerService) {
          info.firstReplyCustomerService = encodeUser(firstReplyCustomerService);
        }
      }
    }
    map[ticket.id] = info;
    return map;
  }, {});
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

function encodeFieldName(field: { id: string; title?: string }) {
  if (field.title) {
    return `field-${field.id}-${field.title}`;
  }
  return `field-${field.id}`;
}

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
  'evaluation.selections',
  'firstCustomerServiceReplyAt',
  'latestCustomerServiceReplyAt',
  'group.id',
  'group.name',
  'group.description',
  'metaData',
  'privateTags',
  'customForm',
  'language',
  'createdAt',
  'updatedAt',
  'firstReplyTime.seconds',
  'firstReplyCustomerService.nickname',
  'replies',
];

const authOptions = { useMasterKey: true };
const limit = 20;

export interface ExportTicketData {
  keys: string[];
  data: Record<string, any>;
}

async function* createExportGenerator({
  params,
  sortItems,
  utcOffset,
}: JobData): AsyncGenerator<ExportTicketData> {
  const formatDate = _.partial(format, _, utcOffset);
  const { type: fileType, ...rest } = params;
  const [query, containFields] = await createBaseTicketQuery(rest, sortItems);
  const count = await query.count(authOptions);
  const categoryMap = await getCategories();
  const getCustomFormFields = getCustomFormFieldsFunc(authOptions);
  const fieldKeys = new Set<string>();

  for (let index = 0; index < count; index += limit) {
    const tickets = await (await createTicketQuery(containFields, query, index, limit))
      .preload('author')
      .preload('assignee')
      .preload('group')
      .find(authOptions);
    const ticketIds = tickets.map((ticket) => ticket.id);
    const replyMap = await getReplies(ticketIds);
    const formIds = tickets
      .map((ticket) =>
        categoryMap[ticket.categoryId] ? categoryMap[ticket.categoryId].formId : undefined
      )
      .filter((id) => id !== undefined);
    const { formCacheMap, fieldCacheMap } = await getCustomFormFields(formIds as string[]);
    const fieldValuesMap = await getFieldValues(ticketIds, authOptions);
    for (let ticketIndex = 0; ticketIndex < tickets.length; ticketIndex++) {
      const ticket = tickets[ticketIndex];
      const category = categoryMap[ticket.categoryId];
      const fields = fieldValuesMap[ticket.id]?.values.map(({ field, value }) => ({
        id: field,
        title: fieldCacheMap.get(field),
        value: value,
      }));
      const keys = fields?.map(encodeFieldName) ?? [];
      keys.forEach((key) => fieldKeys.add(key));
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

      const replies = replyMap[ticket.id].map((reply) => {
        return {
          id: reply.id,
          ticketId: reply.ticketId,
          content: reply.content,
          authorId: reply.authorId,
          isCustomerService: reply.isCustomerService,
          createdAt: format(reply.createdAt, utcOffset),
        };
      });

      const firstReplyInfo = await getFirstReplyInfo(tickets, replyMap);

      const data = {
        ..._.pick(ticket, FIXED_KEYS),
        author: ticket.author && encodeUser(ticket.author),
        assignee: ticket.assignee && encodeUser(ticket.assignee),
        group: ticket.group && encodeGroup(ticket.group),
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
        replies,
        createdAt: formatDate(ticket.createdAt),
        updatedAt: formatDate(ticket.updatedAt),
        ...firstReplyInfo[ticket.id],
        ..._.zipObject(keys, fields?.map((field) => field.value) ?? []),
      };

      yield {
        keys: [...FIXED_KEYS, ...fieldKeys],
        data,
      };
    }
  }
}

export default async function exportTicket(jobData: JobData) {
  const { params, date } = jobData;
  const { type: fileType = 'json' } = params;
  const exportFileName = `ticket_${dateFnsFormat(new Date(date), 'yyMMdd_HHmmss')}`;

  const bufferPath = `/tmp/export_ticket_buffer_${Date.now()}`;
  const bufferFile = await fs.open(bufferPath, 'w+');

  try {
    const transform = fileType === 'json' ? new JsonTransform() : new CsvTransform();

    await pipeline(createExportGenerator(jobData), transform, bufferFile.createWriteStream(), {
      end: false,
    });

    const buffer = new WritableStreamBuffer();
    const archive = createCompressStream(buffer, exportFileName + '.' + fileType);

    if (fileType === 'csv') {
      // BOM
      archive.write(Buffer.from([0xef, 0xbb, 0xbf]));
      if (transform.lastChunk) {
        // Last chunk has complete keys, we use it as the csv header row.
        archive.write(transform.lastChunk.keys.join(',') + '\n');
      }
    }

    bufferFile.createReadStream({ start: 0 }).pipe(archive);
    await finished(buffer);

    const contents = buffer.getContents();
    if (!contents) {
      throw new Error('Read contents failed');
    }

    const avFile = new AV.File(exportFileName + '.zip', contents);
    await avFile.save({ useMasterKey: true });

    return {
      url: avFile.url(),
      ticketCount: transform.count,
    };
  } finally {
    await bufferFile.close();
    await fs.rm(bufferPath);
  }
}
