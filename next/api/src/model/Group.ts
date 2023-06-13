import { Model, field, pointTo, pointerId } from '@/orm';
import { Role } from './Role';

export interface TinyGroupInfo {
  objectId: string;
  name: string;
}

export interface GroupPermission {
  view: boolean;
  list: boolean;
  statistic: boolean;
}

export const DefaultGroupPermission: GroupPermission = {
  view: true,
  list: false,
  statistic: false,
};

export class Group extends Model {
  @field()
  name!: string;

  @field()
  description?: string;

  @pointerId(() => Role)
  roleId!: string;

  @pointTo(() => Role)
  role?: Role;

  @field()
  permissions!: GroupPermission;

  getTinyInfo(): TinyGroupInfo {
    return {
      objectId: this.id,
      name: this.name,
    };
  }
}
