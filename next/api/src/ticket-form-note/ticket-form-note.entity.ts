import { Model, field, serialize } from '@/orm';

export class TicketFormNote extends Model {
  @field()
  @serialize()
  title!: string;

  @field()
  @serialize()
  content!: string;

  @field()
  @serialize()
  active!: boolean;
}
