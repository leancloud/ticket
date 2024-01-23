import { field, Model, pointerId, pointTo } from '@/orm';
import { User } from './User';

export class MergeUserTask extends Model {
  @pointerId(() => User)
  sourceUserId!: string;

  @pointTo(() => User)
  sourceUser?: User;

  @pointerId(() => User)
  targetUserId!: string;

  @pointTo(() => User)
  targetUser?: User;

  @field()
  mergingData!: {
    authData?: Record<string, any>;
    email?: string;
  };

  @field()
  status!: string;

  @field()
  completedAt?: Date;
}
