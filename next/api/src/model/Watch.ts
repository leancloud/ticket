import { Model, pointerId } from '@/orm';
import { Ticket } from './Ticket';
import { User } from './User';

export class Watch extends Model {
  @pointerId(() => Ticket)
  ticketId!: string;

  @pointerId(() => User)
  userId!: string;
}
