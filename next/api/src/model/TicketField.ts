import { Model, field } from '@/orm';

export class TicketField extends Model {
  @field()
  title!: string;

  @field()
  type!: string;

  @field()
  defaultLocale!: string;

  @field()
  active!: boolean;

  @field()
  required!: boolean;
}
