import { Model, field, pointerIds, pointerId, pointTo } from '../orm';
import { FAQ } from './FAQ';
import { TicketForm } from './TicketForm';

export class Category extends Model {
  @field()
  name!: string;

  @field()
  description?: string;

  @pointerId(() => Category)
  parentId?: string;

  @field()
  order?: number;

  @pointerIds(() => FAQ)
  FAQIds?: string[];

  @pointerId(() => TicketForm)
  formId?: string;

  @pointTo(() => TicketForm)
  form?: TicketForm;

  @field()
  deletedAt?: Date;
}
