import { Group } from '../model/group';

export class GroupJson {
  constructor(readonly group: Group) {}

  toJSON() {
    return {
      id: this.group.id,
      name: this.group.name,
    };
  }
}
