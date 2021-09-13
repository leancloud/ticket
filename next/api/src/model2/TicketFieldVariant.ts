import { Model, field, pointerId, pointTo } from '../orm';
import { TicketField, presetTicketFields } from './TicketField';

export class TicketFieldVariant extends Model {
  @pointerId(() => TicketField)
  fieldId!: string;

  @pointTo(() => TicketField)
  field?: TicketField;

  @field()
  title!: string;

  @field()
  locale!: string;

  @field()
  options?: [string, string][]; // [value, title] :sweat_smile:
}

export const presetTicketFieldVariants = presetTicketFields.map((field) => {
  const variant = new TicketFieldVariant();
  // @ts-ignore
  variant.id = field.id;
  variant.fieldId = field.id;
  variant.field = field;
  variant.title = field.title;
  variant.locale = field.defaultLocale;
  // @ts-ignore
  variant.createdAt = field.createdAt;
  // @ts-ignore
  variant.updatedAt = field.updatedAt;
  return variant;
});
