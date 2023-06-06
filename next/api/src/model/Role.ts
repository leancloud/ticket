import { Model, field, hasManyThroughRelation } from '@/orm';
import { User } from './User';

export class Role extends Model {
  protected static className = '_Role';

  private static getAdminRoleTask?: Promise<Role>;
  private static getCustomerServiceRoleTask?: Promise<Role>;
  private static getStaffRoleTask?: Promise<Role>;

  @field()
  name!: string;

  @hasManyThroughRelation(() => Role)
  roles!: Role[];

  @hasManyThroughRelation(() => User)
  users!: User[];

  static getAdminRole(): Promise<Role> {
    if (!this.getAdminRoleTask) {
      this.getAdminRoleTask = (async () => {
        try {
          const query = this.queryBuilder().where('name', '==', 'admin');
          const role = await query.first({ useMasterKey: true });
          if (!role) {
            throw new Error('The admin role does not exist');
          }
          return role;
        } catch (error) {
          delete this.getAdminRoleTask;
          throw error;
        }
      })();
    }
    return this.getAdminRoleTask;
  }

  static getCustomerServiceRole(): Promise<Role> {
    if (!this.getCustomerServiceRoleTask) {
      this.getCustomerServiceRoleTask = (async () => {
        try {
          const query = this.queryBuilder().where('name', '==', 'customerService');
          const role = await query.first({ useMasterKey: true });
          if (!role) {
            throw new Error('The customer service role does not exist');
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

  static getStaffRole(): Promise<Role> {
    if (!this.getStaffRoleTask) {
      this.getStaffRoleTask = (async () => {
        try {
          const query = this.queryBuilder().where('name', '==', 'staff');
          const role = await query.first({ useMasterKey: true });
          if (!role) {
            throw new Error('The staff role does not exist');
          }
          return role;
        } catch (error) {
          delete this.getStaffRoleTask;
          throw error;
        }
      })();
    }
    return this.getStaffRoleTask;
  }
}
