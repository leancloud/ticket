import { Model, field, pointerId, pointTo, pointerIds, hasManyThroughPointerArray } from '@/orm';
import { File } from './File';
import { Reply } from './Reply';
import { User } from './User';

export class ReplyRevision extends Model {
  @pointerId(() => Reply)
  replyId!: string;

  @field()
  content?: string;

  @field()
  contentHTML?: string;

  @pointerIds(() => File)
  fileIds?: string[];

  @hasManyThroughPointerArray(() => File)
  files?: File[];

  @pointerId(() => User)
  operatorId!: string;

  @pointTo(() => User)
  operator?: User;

  @field()
  action!: 'create' | 'update' | 'delete';

  @field()
  actionTime!: Date;
}
