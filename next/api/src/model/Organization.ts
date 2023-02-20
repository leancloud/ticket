import { Model, field, pointTo, pointerId } from '@/orm';
import { Role } from './Role';

export class Organization extends Model {
  @field()
  name!: string;

  @pointerId(() => Role)
  adminRoleId!: string;

  @pointTo(() => Role)
  adminRole?: Role;

  @pointerId(() => Role)
  memberRoleId!: string;

  @pointTo(() => Role)
  memberRole?: Role;
}
