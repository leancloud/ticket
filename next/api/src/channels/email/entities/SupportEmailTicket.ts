import { Ticket } from '@/model/Ticket';
import { Model, field, pointerId } from '@/orm';

export class SupportEmailTicket extends Model {
  @field()
  email!: string;

  @field()
  messageId!: string;

  @pointerId(() => Ticket)
  ticketId!: string;
}
