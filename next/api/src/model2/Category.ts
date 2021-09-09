import { Model, field, pointerArray, pointerId, pointTo } from '../orm';
import { FAQ } from './FAQ';
import { TicketForm } from './TicketForm';

export class Category extends Model {
  @field()
  name!: string;

  @field()
  description?: string;

  @pointerId(Category)
  parentId?: string;

  @field()
  order?: number;

  @pointerArray(FAQ)
  FAQIds?: string[];

  @pointerId(TicketForm)
  formId?: string;

  @pointTo(TicketForm)
  form?: TicketForm;

  @field()
  deletedAt?: Date;
}
