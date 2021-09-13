import { Model, field, pointerId, pointTo, pointerIds, hasManyThroughPointerArray } from '../orm';
import { File } from './File';
import { Ticket } from './Ticket';
import { User } from './User';

export class Reply extends Model {
  @field()
  content!: string;

  @field('content_HTML')
  contentHTML!: string;

  @pointerId(() => User)
  authorId!: string;

  @pointTo(() => User)
  author?: User;

  @field()
  isCustomerService!: boolean;

  @pointerIds(() => File)
  fileIds?: string[];

  @hasManyThroughPointerArray(() => File)
  files?: File[];

  @field()
  internal?: boolean;

  @pointerId(() => Ticket)
  ticketId!: string;

  @pointTo(() => Ticket)
  ticket?: Ticket;

  @field()
  deletedAt?: Date;
}
