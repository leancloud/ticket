import AV from 'leancloud-storage';
import {
  assertAVObjectHasAttributes,
  assertAVObjectHasBeenSaved,
  assertAVObjectHasTimestamps,
} from '../../utils/av';

export interface OrganizationData {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Organization {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: OrganizationData) {
    this.id = data.id;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromAVObject(object: AV.Object): Organization {
    assertAVObjectHasBeenSaved(object);
    assertAVObjectHasAttributes(object, 'name');
    assertAVObjectHasTimestamps(object);
    return new Organization({
      id: object.id,
      name: object.get('name'),
      createdAt: object.createdAt,
      updatedAt: object.updatedAt,
    });
  }
}
