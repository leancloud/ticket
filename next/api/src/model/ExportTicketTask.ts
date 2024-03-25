import { Model, field, pointTo, pointerId } from '@/orm';
import { User } from './User';

export class ExportTicketTask extends Model {
  @pointerId(() => User)
  operatorId?: string;

  @pointTo(() => User)
  operator?: User;

  @field()
  ticketCount?: number;

  @field()
  status?: string;

  @field()
  completedAt?: Date;

  @field()
  downloadUrl?: string;
}
