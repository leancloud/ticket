import { Model, field } from '@/orm';

export class TicketStatusStats extends Model {
  protected static className = 'TicketStatusStats';
  @field()
  date?: Date;
  @field()
  notProcessed?: number;
  @field()
  waitingCustomer?: number;
  @field()
  waitingCustomerService?: number;
  @field()
  preFulfilled?: number;
  @field()
  fulfilled?: number;
  @field()
  closed?: number;


  static async fetchTicketStatus(params: {
    from: Date;
    to: Date;
  }, limit = 100, skip = 0): Promise<TicketStatusStats[]> {
    const data = await TicketStatusStats.queryBuilder()
      .where('date', '>=', params.from)
      .where('date', '<=', params.to)
      .limit(limit)
      .skip(skip)
      .find({ useMasterKey: true })
    if (data.length === limit) {
      const nextData = await TicketStatusStats.fetchTicketStatus(params, limit, limit + skip);
      return [...data, ...nextData]
    }
    return data;
  }
}


