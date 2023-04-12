import { Model, field, pointerId } from '@/orm';
import { Reply } from '@/model/Reply';
import { Ticket } from '@/model/Ticket';

export class SupportEmailMessage extends Model {
  @field()
  from?: string;

  @field()
  to!: string;

  @field()
  messageId!: string;

  @field()
  inReplyTo?: string;

  @field()
  references?: string[];

  @field()
  subject?: string;

  @field()
  html?: string;

  @field()
  date?: Date;

  @field()
  attachments?: { objectId: string; cid?: string }[];

  @pointerId(() => Ticket)
  ticketId!: string;

  @pointerId(() => Reply)
  replyId?: string;
}
