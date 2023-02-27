import AV from 'leancloud-storage';
import LRUCache from 'lru-cache';
import { Role } from '@/model/Role';
import { User } from '@/model/User';

const SYSTEM_ROLE_NAMES = ['admin', 'customerService', 'staff'];

export class RoleService {
  private systemRolesCache = new LRUCache<string, string[]>({
    max: 10000,
    ttl: 1000 * 60,
  });

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

  async getSystemRolesForUser(userId: string) {
    const cached = this.systemRolesCache.get(userId);
    if (cached) {
      return cached;
    }

    const roles = await Role.queryBuilder()
      .select('name')
      .where('users', '==', User.ptr(userId))
      .where('name', 'in', SYSTEM_ROLE_NAMES)
      .find();
    const names = roles.map((role) => role.name);

    this.systemRolesCache.set(userId, names);
    return names;
  }
}

export const roleService = new RoleService();
