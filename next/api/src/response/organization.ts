import { Organization } from '@/model/Organization';

export class OrganizationResponse {
  constructor(readonly org: Organization) {}

  toJSON() {
    return {
      id: this.org.id,
      name: this.org.name,
    };
  }
}
