import { Model, field, serialize } from '@/orm';

export class TicketFormNote extends Model {
  @field()
  @serialize()
  name!: string;

  @field()
  @serialize()
  content!: string;

  @field()
  @serialize()
  active!: boolean;
}
