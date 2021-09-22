import { Model, field, pointTo, pointerId } from '../orm';
import { Role } from './Role';

export interface TinyGroupInfo {
  objectId: string;
  name: string;
}

export class Group extends Model {
  @field()
  name!: string;

  @field()
  description?: string;

  @pointerId(() => Role)
  roleId!: string;

  @pointTo(() => Role)
  role!: Role;

  getTinyInfo(): TinyGroupInfo {
    return {
      objectId: this.id,
      name: this.name,
    };
  }
}
