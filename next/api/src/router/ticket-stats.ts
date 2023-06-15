import Router from '@koa/router';
import _ from 'lodash';
import { escape } from 'sqlstring';

import * as yup from '@/utils/yup';
import { auth, customerServiceOnly, parseRange } from '@/middleware';
import { TicketStats } from '@/model/TicketStats';
import { categoryService } from '@/category';
import { TicketStatusStats } from '@/model/TicketStatusStats';
import { Group } from '@/model/Group';
import { User } from '@/model/User';
import { Role } from '@/model/Role';
import {
  EvaluationCounts,
  EvaluationStats,
  TicketStatusStatsResponse,
} from '@/response/ticket-stats';
import { ticketFiltersSchema } from './ticket';
import { ClickHouse, FunctionColumn, quoteValue } from '@/orm/clickhouse';

const EvaluationFields = ['dislikeCount', 'likeCount'] as const;

const router = new Router().use(auth, customerServiceOnly);

const BaseSchema = {
  from: yup.date().required(),
  to: yup.date().required(),
  category: yup.string().optional(),
  customerService: yup.string().optional(),
  group: yup.string().optional(),
};

const statsSchema = yup.object().shape(BaseSchema);
router.get('/', async (ctx) => {
  const { category, customerService, group, ...rest } = statsSchema.validateSync(ctx.query);
  const categoryIds = await getCategoryIds(category);
  const customerServiceIds = await getCustomerServiceIds(customerService, group);
  const data = await TicketStats.fetchTicketStats({
    ...rest,
    customerServiceIds,
    categoryIds,
  });

  const evaluationStats = await getEvaluationStats({
    categoryIds,
    customerServiceIds,
    count: true,
    ...rest,
  });

  ctx.body = { ...(data || {}), ...evaluationStats };
});

const fieldStatsSchema = yup.object(BaseSchema).shape({
  fields: yup.string().required(),
  bySelection: yup.boolean().default(true),
});
router.get('/fields', async (ctx) => {
  const {
    category,
    customerService,
    fields,
    group,
    bySelection,
    ...rest
  } = fieldStatsSchema.validateSync(ctx.query);

  const fieldArr = fields.split(',');

  const intersectionWithEvaluation = _.intersection(fieldArr, EvaluationFields);

  if (intersectionWithEvaluation.length && _.difference(fieldArr, EvaluationFields).length) {
    ctx.throw(400, "Evaluation fields and other fields can't both exist.");
    return;
  }

  const categoryIds = await getCategoryIds(category);
  const customerServiceIds = await getCustomerServiceIds(customerService, group);

  if (intersectionWithEvaluation.length === 0) {
    const data = await TicketStats.fetchTicketFieldStats({
      ...rest,
      customerServiceIds,
      categoryIds,
      fields: fields.split(','),
    });
    ctx.body = data;
  } else {
    ctx.body = await getEvaluationStats({ categoryIds, customerServiceIds, bySelection, ...rest });
  }
});

const statusSchema = yup.object(BaseSchema).pick(['from', 'to']);
router.get('/status', async (ctx) => {
  const { from, to } = statusSchema.validateSync(ctx.query);
  const data = await TicketStatusStats.fetchTicketStatus({
    from,
    to,
  });
  ctx.body = data.map((value) => new TicketStatusStatsResponse(value));
});

const detailSchema = yup.object(BaseSchema).shape({
  field: yup.string().required(),
});
router.get('/details', async (ctx) => {
  const { category, customerService, group, ...rest } = detailSchema.validateSync(ctx.query);
  const categoryIds = await getCategoryIds(category);
  const customerServiceIds = await getCustomerServiceIds(customerService, group);
  const data = await TicketStats.fetchReplyDetails({
    ...rest,
    customerServiceIds,
    categoryIds,
  });
  ctx.body = data || [];
});

const activeTicketCountSchema = yup.object(BaseSchema).pick(['from', 'to']);
router.get('/count', async (ctx) => {
  const params = activeTicketCountSchema.validateSync(ctx.query);
  const data = await TicketStats.fetchReplyDetails({
    ...params,
    field: 'naturalReplyTime',
    customerServiceIds: '*',
  });
  ctx.body = _(data).groupBy('nid').keys().valueOf().length;
});

const realtimeSchema = ticketFiltersSchema.omit(['page', 'pageSize', 'tagKey', 'tagValue']).shape({
  type: yup.string().oneOf(['status', 'category', 'group', 'assignee']).required(),
});
router.get('/realtime', parseRange('createdAt'), async (ctx) => {
  const params = realtimeSchema.validateSync(ctx.query);
  const categoryIds = await getCategoryIds(params.product || params.rootCategoryId);
  let selectList: string[] = [];
  let groupBy: string[] = [];
  switch (params.type) {
    case 'status':
      selectList = [
        'countIf(status = 280) as closed',
        'countIf(status = 250) as fulfilled',
        'countIf(status = 220) as preFulfilled',
        'countIf(status = 160) as waitingCustomer',
        'countIf(status = 120) as waitingCustomerService',
        'countIf(status = 50) as notProcessed',
      ];
      break;
    case 'category':
      selectList = ['categoryId', 'count() as count'];
      groupBy = ['categoryId'];
      break;
    case 'group':
      selectList = ['groupId', 'count() as count'];
      groupBy = ['groupId'];
      break;
    case 'assignee':
      selectList = ['assigneeId', 'count() as count'];
      groupBy = ['assigneeId'];
      break;
  }
  let privateTagCondition = [];
  if (params['privateTagKey']) {
    privateTagCondition.push(params['privateTagKey']);
  }
  if (params['privateTagValue']) {
    privateTagCondition.push(params['privateTagValue']);
  }

  const ticketLogLatest = new ClickHouse()
    .from('TicketLog')
    .select(
      'argMax(authorId, ticketUpdatedTime) as authorId',
      'argMax(assigneeId, ticketUpdatedTime) as assigneeId',
      'argMax(groupId, ticketUpdatedTime) as groupId',
      'argMax(status, ticketUpdatedTime) as status',
      'argMax(categoryId, ticketUpdatedTime) as categoryId',
      'argMax(ticketCreatedAt, ticketUpdatedTime) as ticketCreatedAt',
      'argMax(evaluation, ticketUpdatedTime) as evaluation',
      'argMax(privateTags, ticketUpdatedTime) as privateTags',
      'ticketId',
      'nid'
    )
    .groupBy('ticketId', 'nid');

  const data = await new ClickHouse()
    .from(ticketLogLatest)
    .select(...selectList)
    .where('authorId', params['authorId'])
    .where('assigneeId', params['assigneeId'], 'in')
    .where('groupId', params['groupId'], 'in')
    .where('status', params['status'], 'in')
    .where('categoryId', categoryIds, 'in')
    .where('ticketCreatedAt', params.createdAtFrom, '>')
    .where('ticketCreatedAt', params.createdAtTo, '<')
    .where(new FunctionColumn(`JSONExtractInt(evaluation,'star')`), params['evaluation.star'])
    .where(
      new FunctionColumn(
        `arrayExists( v ->${privateTagCondition
          .map((v, i) => `tupleElement(v, ${i + 1}) = ${quoteValue(v)}`)
          .join(' and ')},
            arrayMap( (v) -> (
                JSONExtractString(v, 'key'),
                JSONExtractString(v, 'value')
            ),privateTags))`
      ),
      privateTagCondition.length > 0 ? 1 : undefined
    )
    .groupBy(...groupBy)
    .find();
  ctx.body = data;
});

export default router;

async function getCategoryIds(categoryId?: string) {
  if (!categoryId) {
    return;
  }
  if (categoryId === '*') {
    return '*';
  }
  const categories = await categoryService.getSubCategories(categoryId);
  return [categoryId, ...categories.map((v) => v.id)];
}

async function getCustomerServiceIds(customerServiceId?: string, groupId?: string) {
  if (!customerServiceId && !groupId) {
    return;
  }
  if (customerServiceId === '*') {
    return '*';
  }
  let result = customerServiceId ? [customerServiceId] : [];
  if (groupId) {
    const group = await Group.find(groupId, {
      useMasterKey: true,
    });
    if (group) {
      const users = await User.queryBuilder().relatedTo(Role, 'users', group.roleId).find({
        useMasterKey: true,
      });
      const ids = users.map((user) => user.id);
      result = result.concat(ids);
    }
  }
  return result;
}

interface GetEvaluationStatsBase {
  categoryIds?: Awaited<ReturnType<typeof getCategoryIds>>;
  customerServiceIds?: Awaited<ReturnType<typeof getCustomerServiceIds>>;
  from?: Date;
  to?: Date;
  bySelection?: boolean;
}

async function getEvaluationStats(
  options: GetEvaluationStatsBase & {
    count: true;
  }
): Promise<EvaluationCounts>;
async function getEvaluationStats(
  options: GetEvaluationStatsBase & {
    count?: false;
  }
): Promise<EvaluationStats[]>;
async function getEvaluationStats(
  options: GetEvaluationStatsBase & {
    count?: boolean;
  } = {}
): Promise<EvaluationCounts | EvaluationStats[]> {
  const { categoryIds, count, customerServiceIds, from, to, bySelection } = options;

  const sql = `
    SELECT
      count(DISTINCT t.objectId) AS count,
      ${!count && bySelection ? 'selection,' : ''}
      ${categoryIds ? 'categoryId,' : ''}
      ${customerServiceIds ? 'customerServiceId,' : ''}
      visitParamExtractUInt(t.evaluation, 'star') AS star
    FROM Ticket AS t
    ${
      !count && bySelection
        ? `LEFT ARRAY JOIN
      JSONExtract(t.evaluation, 'selections', 'Array(String)') AS selection`
        : ''
    }
    WHERE t.evaluation != ''
    ${
      categoryIds && Array.isArray(categoryIds)
        ? `AND arrayExists(x -> x = visitParamExtractString(t.category, 'objectId'), [${categoryIds
            .map((id) => escape(id))
            .join(',')}])`
        : ''
    }
    ${
      customerServiceIds && Array.isArray(customerServiceIds)
        ? `AND arrayExists(x -> x = t.\`assignee.objectId\`, [${customerServiceIds
            .map((id) => escape(id))
            .join(',')}])`
        : ''
    }
    ${from ? `AND t.createdAt >= parseDateTimeBestEffortOrNull(${escape(from)})` : ''}
    ${to ? `AND t.createdAt <= parseDateTimeBestEffortOrNull(${escape(to)})` : ''}
    GROUP BY
      ${!count && bySelection ? 'selection,' : ''}
      ${categoryIds ? "visitParamExtractString(t.category, 'objectId') AS categoryId," : ''}
      ${customerServiceIds ? 't.`assignee.objectId` AS customerServiceId,' : ''}
      star
  `;

  const res = await ClickHouse.findWithSqlStr<{
    results: {
      count: string;
      selection?: string;
      categoryId?: string;
      customerServiceId?: string;
      star: string;
    }[];
  }>(sql);

  if (count) {
    const processed = {
      likeCount: 0,
      dislikeCount: 0,
      ..._(res)
        .groupBy(({ star }) => EvaluationFields[Number(star)])
        .mapValues((counts) => counts.reduce((acc, { count }) => acc + (Number(count) || 0), 0))
        .value(),
    };

    return {
      ...processed,
      likeRate: processed.likeCount / (processed.dislikeCount + processed.likeCount) || 0,
      dislikeRate: processed.dislikeCount / (processed.dislikeCount + processed.likeCount) || 0,
    };
  }

  return _(res)
    .groupBy(
      ({ categoryId, customerServiceId, selection }) =>
        `${selection}-${categoryId}-${customerServiceId}`
    )
    .mapValues((counts) =>
      counts.reduce<Omit<EvaluationStats, 'dislikeRate' | 'likeRate'>>(
        (acc, { count, categoryId, customerServiceId, star, selection }) => ({
          ...acc,
          categoryId,
          customerServiceId,
          selection,
          [EvaluationFields[Number(star)] as 'dislikeCount' | 'likeCount']:
            (acc[EvaluationFields[Number(star)]] as number) + Number(count),
        }),
        { likeCount: 0, dislikeCount: 0 }
      )
    )
    .values()
    .value();
}
