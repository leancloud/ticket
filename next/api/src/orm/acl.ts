export type RawACL = Record<string, { read?: true; write?: true }>;

export type Privilege = 'read' | 'write';

export class ACLBuilder {
  constructor(private data: RawACL = {}) {}

  toJSON() {
    return this.data;
  }

  allow(user: string | { id: string }, ...privileges: Privilege[]): this {
    const id = typeof user === 'string' ? user : user.id;
    privileges.forEach((p) => {
      this.data[id] ??= {};
      this.data[id][p] = true;
    });
    return this;
  }

  disallow(user: string | { id: string }, ...privileges: Privilege[]): this {
    const id = typeof user === 'string' ? user : user.id;
    privileges.forEach((p) => delete this.data[id][p]);
    return this;
  }

  allowRole(role: string | { name: string }, ...privileges: Privilege[]): this {
    const name = typeof role === 'string' ? role : role.name;
    return this.allow('role:' + name, ...privileges);
  }

  disallowRole(role: string | { name: string }, ...privileges: Privilege[]): this {
    const name = typeof role === 'string' ? role : role.name;
    return this.disallow('role:' + name, ...privileges);
  }

  allowCustomerService(...privileges: Privilege[]): this {
    return this.allowRole('customerService', ...privileges);
  }

  disallowCustomerService(...privileges: Privilege[]): this {
    return this.disallowRole('customerService', ...privileges);
  }

  allowOrgMember(org: string | { id: string }, ...privileges: Privilege[]): this {
    const id = typeof org === 'string' ? org : org.id;
    return this.allowRole(id + '_member', ...privileges);
  }

  disallowOrgMember(org: string | { id: string }, ...privileges: Privilege[]): this {
    const id = typeof org === 'string' ? org : org.id;
    return this.disallowRole(id + '_member', ...privileges);
  }

  allowStaff(...privileges: Privilege[]): this {
    return this.allowRole('staff', ...privileges);
  }

  disallowStaff(...privileges: Privilege[]): this {
    return this.disallowRole('staff', ...privileges);
  }
}
