import AV from 'leancloud-storage';

import { assertAVObjectHasAttributes, assertAVObjectHasBeenSaved } from '../../utils/av';

export interface GroupData {
  id: string;
  name: string;
}

export class Group {
  readonly id: string;
  readonly name: string;

  constructor(data: GroupData) {
    this.id = data.id;
    this.name = data.name;
  }

  static fromAVObject(object: AV.Object) {
    assertAVObjectHasBeenSaved(object);
    assertAVObjectHasAttributes(object, 'name');
    return new Group({
      id: object.id,
      name: object.get('name'),
    });
  }
}
