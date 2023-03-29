import { Group } from '@/model/Group';
import { roleService } from './role';

export class GroupService {
  getGroup(id: string) {
    return Group.find(id, { useMasterKey: true });
  }

  async isGroupMember(groupId: string, userId: string) {
    const group = await this.getGroup(groupId);
    if (!group) {
      return false;
    }
    return roleService.isRoleMember(group.roleId, userId);
  }
}

export const groupService = new GroupService();
