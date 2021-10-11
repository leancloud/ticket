import { Model, field, pointerId, pointTo } from '@/orm';
import { Ticket } from './Ticket';

export interface FieldValue {
  field: string;
  value: string | string[];
}

export class TicketFieldValue extends Model {
  @pointerId(() => Ticket)
  ticketId!: string;

  @pointTo(() => Ticket)
  ticket?: Ticket;

  @field()
  values!: FieldValue[];
}
