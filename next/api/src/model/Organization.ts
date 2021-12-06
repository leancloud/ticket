import { Model, field, pointTo } from '@/orm';
import { Role } from './Role';

export class Organization extends Model {
  @field()
  name!: string;

  @pointTo(() => Role)
  adminRole!: Role;

  @pointTo(() => Role)
  memberRole!: Role;
}
