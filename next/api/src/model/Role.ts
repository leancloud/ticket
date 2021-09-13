import AV from 'leancloud-storage';

import { Model, field, hasManyThroughRelation } from '../orm';
import { User } from './User';

export class Role extends Model {
  static readonly className = '_Role';

  static readonly avObjectConstructor = AV.Role as any;

  private static getCustomerServiceRoleTask?: Promise<Role>;

  @field()
  name!: string;

  @hasManyThroughRelation(() => Role)
  roles!: Role[];

  @hasManyThroughRelation(() => User)
  users!: User[];

  static getCustomerServiceRole(): Promise<Role> {
    if (!this.getCustomerServiceRoleTask) {
      this.getCustomerServiceRoleTask = (async () => {
        try {
          const query = this.queryBuilder().where('name', '==', 'customerService');
          const role = await query.first({ useMasterKey: true });
          if (!role) {
            throw new Error('The customer service role is not exists');
          }
          return role;
        } catch (error) {
          delete this.getCustomerServiceRoleTask;
          throw error;
        }
      })();
    }
    return this.getCustomerServiceRoleTask;
  }
}
