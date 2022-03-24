import { Model, pointTo, pointerId, field } from '@/orm';
import { User } from './User';
import { Category } from './Category';
import { TicketStatsResponse } from '@/response/ticket-stats'
import _ from 'lodash';

interface SumTicketStat {
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

  static async fetchTicketStats(params: {
    from: Date;
    to: Date;
    customerServiceId?: string;
    categoryIds?: string[];
  }, limit = 100, skip = 0): Promise<SumTicketStat | undefined> {
    const query = TicketStats.queryBuilder()
      .where('date', '>=', params.from)
      .where('date', '<=', params.to)
      .limit(limit)
      .skip(skip)
    if (params.categoryIds) {
      query.where('category', 'in', params.categoryIds.map(id => Category.ptr(id)))
    } else {
      query.where('category', 'not-exists')
    }
    if (params.customerServiceId) {
      query.where('customerService', '==', User.ptr(params.customerServiceId))
    } else {
      query.where('customerService', 'not-exists')
    }
    const data = await query.find({ useMasterKey: true })
    const sum = sumTicketStats(data)
    if (data.length === limit) {
      const nextData = await TicketStats.fetchTicketStats(params, limit, limit + skip);
      if (!nextData) {
        return sum;
      }
      return _.mergeWith(sum, nextData, (obj = 0, src = 0) => obj + src)
    }
    return sum;
  }

  static async fetchTicketFieldStats(params: {
    fields: string[],
    from: Date;
    to: Date;
    customerServiceId?: string | '*';
    categoryIds?: string[] | '*';
  }, limit = 100, skip = 0): Promise<Partial<TicketStats>[]> {
    const query = TicketStats.queryBuilder()
      .where('date', '>=', params.from)
      .where('date', '<=', params.to)
      .limit(limit)
      .skip(skip)
    if (params.categoryIds) {
      if (params.categoryIds === '*') {
        query.where('category', 'exists')
      } else {
        query.where('category', 'in', params.categoryIds.map(id => Category.ptr(id)))
      }
    } else {
      query.where('category', 'not-exists')
    }
    if (params.customerServiceId) {
      if (params.customerServiceId === '*') {
        query.where('customerService', 'exists')
      } else {
        query.where('customerService', '==', User.ptr(params.customerServiceId))
      }
    } else {
      query.where('customerService', 'not-exists')
    }

    const data = await query.find({ useMasterKey: true })
    const pickData = data.map((v) => _.pick(v, [...params.fields, 'date', 'customerServiceId', 'categoryId'])).filter(v => {
      return params.fields.some(field => v[field as keyof TicketStats])
    })
    if (data.length === limit) {
      const nextData = await TicketStats.fetchTicketFieldStats(params, limit, limit + skip);
      return [...pickData, ...nextData]
    }
    return pickData;
  }
}

function sumTicketStats(data: TicketStats[]) {
  if (data.length === 0) {
    return;
  }
  const result: SumTicketStat = {}
  data
    .map(v => _.omit(new TicketStatsResponse(v).toJSON(), ['date', 'id']))
    .forEach((value) => {
      _.mergeWith(result, value, (obj = 0, src = 0) => obj + src);
    })
  return result
}
