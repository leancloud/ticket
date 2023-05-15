import { field, Model, pointerId, pointTo } from '@/orm';
import { Ticket } from './Ticket';

export class DurationMetrics extends Model {
  @pointerId(() => Ticket)
  ticketId!: string;

  @pointTo(() => Ticket)
  ticket?: Ticket;

  @field()
  ticketCreatedAt!: Date;

  @field()
  firstReplyTime?: number;

  @field()
  firstResolutionTime?: number;

  @field()
  fullResolutionTime?: number;

  @field()
  requesterWaitTime?: number;

  @field()
  agentWaitTime?: number;

  @field()
  requesterWaitAt?: Date;

  @field()
  agentWaitAt?: Date;
}
