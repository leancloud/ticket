import { Model, field, hasManyThroughIdArray } from '../orm';
import { TicketField } from './TicketField';

export class TicketForm extends Model {
  @field()
  title!: string;

  @field()
  fieldIds!: string[];

  @hasManyThroughIdArray(TicketField)
  fields!: TicketField[];
}
