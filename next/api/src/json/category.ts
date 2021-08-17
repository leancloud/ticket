import { Category } from '../model/category';
import { TicketFieldVariant } from '../model/ticket-field-variant';

export class CategoryJson {
  constructor(readonly category: Category) {}

  toJSON() {
    return {
      id: this.category.id,
      name: this.category.name,
      parentId: this.category.parentId,
      position: this.category.order ?? this.category.createdAt.getTime(),
      active: !this.category.deletedAt,
    };
  }
}

function optionTupleToMap([value, title]: [string, string]): { title: string; value: string } {
  return { title, value };
}

export class CategoryFieldResponse {
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
