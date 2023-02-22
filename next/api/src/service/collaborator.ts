import { roleService } from './role';

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
}

export const collaboratorService = new CollaboratorService();
