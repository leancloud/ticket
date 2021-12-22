import { Model, field, pointerId, pointTo } from '@/orm';
import { TicketField } from './TicketField';

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
  titleForCustomerService!: string;

  @field()
  description?: string;

  @field()
  locale!: string;

  @field({
    decode: (data: [string, string][]) => data.map(([value, title]) => ({ title, value })),
    encode: (data: Option[]) => data.map(({ title, value }) => [value, title]),
  })
  options?: Option[];
}
