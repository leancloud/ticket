import { Config } from '@/config';
import { roleService } from './role';

interface CollaboratorPrivileges {
  createPublicReply?: boolean;
}

export class CollaboratorService {
  async getCollaboratorRole() {
    const collaboratorRole = await roleService.getRoleByName('collaborator');
    if (!collaboratorRole) {
      throw new Error('Role "collaborator" does not exist');
    }
    return collaboratorRole;
  }

  async createCollaborator(userId: string) {
    const collaboratorRole = await this.getCollaboratorRole();
    await roleService.addUserToRole(collaboratorRole.id, userId);
  }

  async deleteCollaborator(userId: string) {
    const collaboratorRole = await this.getCollaboratorRole();
    await roleService.removeUserFromRole(collaboratorRole.id, userId);
  }

  async getCollaborators() {
    const collaboratorRole = await this.getCollaboratorRole();
    return roleService.getRoleUsers(collaboratorRole.id);
  }

  setPrivileges(value: CollaboratorPrivileges) {
    return Config.set('collaborator.privileges', value);
  }

  getPrivileges(cache?: boolean) {
    return Config.get<CollaboratorPrivileges>('collaborator.privileges', { cache });
  }
}

export const collaboratorService = new CollaboratorService();
