import AV from 'leancloud-storage';

import { field, hasManyThroughRelation, Model } from '../orm';
import { User } from './User';

export class Role extends Model {
  static readonly className = '_Role';

  static readonly avObjectConstructor = AV.Role as any;

  @field()
  name!: string;

  @hasManyThroughRelation(Role)
  roles!: Role[];

  @hasManyThroughRelation(User)
  users!: User[];
}
