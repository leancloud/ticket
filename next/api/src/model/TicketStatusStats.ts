import { Model, field } from '@/orm';

export class TicketStatusStats extends Model {
  protected static className = 'TicketStatusStats';
  @field()
  date?: Date;
  @field()
  accepted?: number;
  @field()
  waiting?: number;
}


