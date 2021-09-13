import { Group } from '../model/Group';

export class GroupJson {
  constructor(readonly group: Group) {}

  toJSON() {
    return {
      id: this.group.id,
      name: this.group.name,
    };
  }
}
