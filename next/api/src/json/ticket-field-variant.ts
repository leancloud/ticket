import { TicketFieldVariant } from '../model/ticket-field-variant';

function optionTupleToMap([value, title]: [string, string]): { title: string; value: string } {
  return { title, value };
}

export class TicketFieldVariantJson {
  constructor(readonly variant: TicketFieldVariant) {}

  toJSON() {
    return {
      id: this.variant.field!.id,
      title: this.variant.title,
      type: this.variant.field!.type,
      required: this.variant.field!.required,
      options: this.variant.options?.map(optionTupleToMap),
    };
  }
}
