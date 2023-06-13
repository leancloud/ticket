import { Group } from '@/model/Group';

export class GroupResponse {
  constructor(readonly group: Group) {}

  toJSON() {
    return {
      id: this.group.id,
      name: this.group.name,
      description: this.group.description,
    };
  }
}

export class GroupDetailResponse extends GroupResponse {
  constructor(group: Group, readonly userIds: string[] = []) {
    super(group);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      userIds: this.userIds,
      permissions: this.group.permissions,
    };
  }
}
