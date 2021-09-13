import { Group } from '../model/Group';

export class GroupResponse {
  constructor(readonly group: Group) {}

  toJSON() {
    return {
      id: this.group.id,
      name: this.group.name,
    };
  }
}
