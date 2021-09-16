import { Model, field, pointerId, pointTo } from '../orm';
import { TicketField, presetTicketFields } from './TicketField';

export interface Option {
  title: string;
  value: string;
}

export class TicketFieldVariant extends Model {
  @pointerId(() => TicketField)
  fieldId!: string;

  @pointTo(() => TicketField)
  field?: TicketField;

  @field()
  title!: string;

  @field()
  locale!: string;

  @field({
    decode: (data: [string, string][]) => data.map(([value, title]) => ({ title, value })),
    encode: (data: Option[]) => data.map(({ title, value }) => [value, title]),
  })
  options?: Option[];
}

export const presetTicketFieldVariants = presetTicketFields.map((field) => {
  const variant = new TicketFieldVariant();
  variant.id = field.id;
  variant.fieldId = field.id;
  variant.field = field;
  variant.title = field.title;
  variant.locale = field.defaultLocale;
  variant.createdAt = field.createdAt;
  variant.updatedAt = field.updatedAt;
  return variant;
});
