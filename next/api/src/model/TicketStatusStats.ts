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
}


