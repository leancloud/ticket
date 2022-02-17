import { field, Model, pointerId, pointerIds } from '@/orm';
import { File } from './File';
import { User } from './User';

export class QuickReply extends Model {
  @pointerId(() => User, 'owner')
  userId!: string;

  @field()
  name!: string;

  @field()
  content!: string;

  @pointerIds(() => File)
  fileIds?: string[];
}
