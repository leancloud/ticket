import { Organization } from '@/model/Organization';
import { roleService } from './role';

export class OrganizationService {
  async isOrganizationMember(orgId: string, userId: string) {
    const org = await Organization.find(orgId, { useMasterKey: true });
    if (!org) {
      return false;
    }
    return roleService.isRoleMember(org.memberRoleId, userId);
  }
}

export const organizationService = new OrganizationService();
