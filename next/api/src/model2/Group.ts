import { Model, field, pointTo, pointerId } from '../orm';
import { Role } from './Role';

export class Group extends Model {
  @field()
  name!: string;

  @field()
  description?: string;

  @pointerId(Role)
  roleId!: string;

  @pointTo(Role)
  role!: Role;
}
