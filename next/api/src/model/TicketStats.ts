import AV from 'leancloud-storage';
import _ from 'lodash';

import { Model, pointTo, pointerId, field } from '@/orm';
import { TicketStatsResponse } from '@/response/ticket-stats';
import { User } from './User';
import { Category } from './Category';

export interface SumTicketStat {
  created?: number;
  closed?: number;
  reopened?: number;
  conversion?: number;
  internalConversion?: number;
  externalConversion?: number;
  replyTime?: number;
  replyTimeCount?: number;
  replyCount?: number;
  firstReplyTime?: number;
  firstReplyCount?: number;
  weekdayReplyTime?: number;
  weekdayReplyTimeCount?: number;
  weekdayReplyCount?: number;
  internalReplyCount?: number;
  naturalReplyTime?: number;
  naturalReplyCount?: number;
  likeCount?: number;
  dislikeCount?: number;
}

interface ReplyDetail {
  id: string;
  nid: number;
  first?: boolean;
  replyTime: number;
  naturalReplyTime: number;
  authorReplyTime: number;
}

export class TicketStats extends Model {
  protected static className = 'TicketStats';
  @pointerId(() => User)
  customerServiceId?: string;
  @pointTo(() => User)
  customerService?: User;

  @pointerId(() => Category)
  categoryId!: string;
  @pointTo(() => Category)
  category?: Category;

  @field()
  date?: Date;
  @field()
  created?: number;
  @field()
  closed?: number;
  @field()
  reopened?: number;
  @field()
  conversion?: number;
  @field()
  internalConversion?: number;
  @field()
  externalConversion?: number;
  @field()
  replyTime?: number;
  @field()
  replyTimeCount?: number;
  @field()
  replyCount?: number;
  @field()
  firstReplyTime?: number;
  @field()
  firstReplyCount?: number;
  @field()
  internalReplyCount?: number;
  @field()
  naturalReplyTime?: number;
  @field()
  naturalReplyCount?: number;
  @field()
  likeCount?: number;
  @field()
  dislikeCount?: number;

  @field()
  replyDetails?: ReplyDetail[];

  static async fetchTicketStats(params: {
    from: Date;
    to: Date;
    customerServiceIds?: string[] | '*';
    categoryIds?: string[] | '*';
  }): Promise<SumTicketStat | undefined> {
    const data = await fetchTicketStats(params);
    return sumTicketStats(data);
  }

  static async fetchTicketFieldStats(params: {
    fields: string[];
    from: Date;
    to: Date;
    customerServiceIds?: string[] | '*';
    categoryIds?: string[] | '*';
  }): Promise<Partial<TicketStats>[]> {
    const data = await fetchTicketStats(params);
    return data
      .map((v) => _.pick(v, [...params.fields, 'date', 'customerServiceId', 'categoryId']))
      .filter((v) => {
        return params.fields.some((field) => v[field as keyof TicketStats]);
      });
  }

  static async fetchReplyDetails(params: {
    from: Date;
    to: Date;
    field: string;
    customerServiceIds?: string[] | '*';
    categoryIds?: string[] | '*';
  }): Promise<Pick<ReplyDetail, 'id' | 'nid' | 'replyTime'>[]> {
    const data = await fetchTicketStats({
      ...params,
      keys: ['replyDetails'],
    });
    return _(data)
      .map((v) => {
        let replyDetails: ReplyDetail[] = v.replyDetails || [];
        if (params.field === 'firstReplyTime') {
          replyDetails = replyDetails.filter((v) => v.first);
        }
        return replyDetails
          .map(({ id, nid, ...rest }) => {
            let replyTime = params.customerServiceIds ? rest.authorReplyTime : rest.replyTime;
            if (params.field === 'naturalReplyTime') {
              replyTime = rest.naturalReplyTime;
            }
            return {
              id,
              nid,
              replyTime,
            };
          })
          .filter((v) => v.replyTime > 0);
      })
      .flatMap()
      .valueOf();
  }
}

function sumTicketStats(data: TicketStats[]) {
  if (data.length === 0) {
    return;
  }
  const result: SumTicketStat = {};
  data
    .map((v) => _.omit(new TicketStatsResponse(v).toJSON(), ['date', 'id', 'replyDetails']))
    .forEach((value) => {
      _.mergeWith(result, value, (obj = 0, src = 0) => obj + src);
    });
  return result;
}

function applyCategoryCondition(query: AV.Query<any>, categoryIds?: '*' | string[]) {
  if (!categoryIds) {
    query.doesNotExist('category');
    return;
  }
  if (categoryIds === '*') {
    query.exists('category');
    return;
  }
  query.containedIn(
    'category',
    categoryIds.map((id) => Category.ptr(id))
  );
}

function applyCustomerServiceCondition(query: AV.Query<any>, customerServiceIds?: '*' | string[]) {
  if (!customerServiceIds) {
    query.doesNotExist('customerService');
    return;
  }
  if (customerServiceIds === '*') {
    query.exists('customerService');
    return;
  }
  query.containedIn(
    'customerService',
    customerServiceIds.map((id) => User.ptr(id))
  );
}

interface FetchTicketStatsOptions {
  from: Date;
  to: Date;
  categoryIds?: '*' | string[];
  customerServiceIds?: '*' | string[];
  keys?: string[];
}

async function fetchTicketStats({
  from,
  to,
  categoryIds,
  customerServiceIds,
  keys,
}: FetchTicketStatsOptions) {
  const query = new AV.Query('TicketStats')
    .greaterThanOrEqualTo('date', from)
    .lessThanOrEqualTo('date', to);
  if (keys?.length) {
    query.select(keys);
  }
  applyCategoryCondition(query, categoryIds);
  applyCustomerServiceCondition(query, customerServiceIds);
  const iterator = {
    [Symbol.asyncIterator]: () => {
      return query.scan({ batchSize: 1000 }, { useMasterKey: true });
    },
  };
  const result: TicketStats[] = [];
  for await (const object of iterator) {
    result.push(TicketStats.fromAVObject(object as AV.Object));
  }
  return result;
}
