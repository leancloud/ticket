import { field, Model, pointerId, pointTo } from '../orm';
import { Ticket } from './Ticket';
import { User } from './User';

export class Notification extends Model {
  static readonly className = 'notification';

  @pointerId(() => User)
  userId!: string;

  @pointTo(() => User)
  user?: User;

  @pointerId(() => Ticket)
  ticketId!: string;

  @pointTo(() => Ticket)
  ticket?: Ticket;

  @field()
  unreadCount!: number;

  @field()
  latestAction!: string;
}
