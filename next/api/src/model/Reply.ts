import { Model, field, pointerId, pointTo, pointerIds, hasManyThroughPointerArray } from '../orm';
import { File } from './File';
import { Ticket } from './Ticket';
import { TinyUserInfo, User } from './User';

export interface TinyReplyInfo {
  objectId: string;
  content: string;
  author: TinyUserInfo;
  isCustomerService: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

  getTinyInfo(): TinyReplyInfo {
    if (!this.author) {
      throw new Error('missing reply author');
    }
    return {
      objectId: this.id,
      author: this.author.getTinyInfo(),
      content: this.content,
      isCustomerService: this.isCustomerService,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Reply.beforeCreate(({ options }) => {
  options.ignoreBeforeHook = true;
  options.ignoreAfterHook = true;
});
