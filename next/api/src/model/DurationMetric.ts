import { field, Model, pointerId } from '@/orm';
import { Ticket } from './Ticket';

export class DurationMetric extends Model {
  @pointerId(() => Ticket)
  ticketId!: string;

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
