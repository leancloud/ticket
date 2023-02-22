import AV from 'leancloud-storage';
import { Role } from '@/model/Role';
import { User } from '@/model/User';

export class RoleService {
  getRoleByName(name: string) {
    return Role.queryBuilder().where('name', '==', name).first({ useMasterKey: true });
  }

  async addUserToRole(roleId: string, userId: string) {
    const avRole = AV.Role.createWithoutData('_Role', roleId);
    const avUser = AV.User.createWithoutData('_User', userId);
    avRole.relation('users').add(avUser);
    await avRole.save(null, { useMasterKey: true });
  }

  async removeUserFromRole(roleId: string, userId: string) {
    const avRole = AV.Role.createWithoutData('_Role', roleId);
    const avUser = AV.User.createWithoutData('_User', userId);
    avRole.relation('users').remove(avUser);
    await avRole.save(null, { useMasterKey: true });
  }

  getRoleUsers(roleId: string) {
    return User.queryBuilder()
      .relatedTo(Role, 'users', roleId)
      .limit(1000)
      .find({ useMasterKey: true });
  }
}

export const roleService = new RoleService();
