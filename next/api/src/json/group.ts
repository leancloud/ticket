import { Group } from '../model2/Group';

export class GroupJson {
  constructor(readonly group: Group) {}

  toJSON() {
    return {
      id: this.group.id,
      name: this.group.name,
    };
  }
}
