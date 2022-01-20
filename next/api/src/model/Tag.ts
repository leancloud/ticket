import { Model, field, pointerId } from '@/orm';
import { Ticket } from './Ticket';
import { User } from './User';

export class Tag extends Model {
  @pointerId(() => Ticket)
  ticketId!: string;

  @pointerId(() => User)
  authorId!: string;

  @field()
  key!: string;

  @field()
  value!: string;
}
