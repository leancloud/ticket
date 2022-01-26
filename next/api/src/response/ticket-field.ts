import _ from 'lodash';

import type { TicketField } from '@/model/TicketField';
import type { TicketFieldVariant } from '@/model/TicketFieldVariant';

export class TicketFieldResponse {
  constructor(readonly field: TicketField, readonly variants?: TicketFieldVariant[]) {}

  protected encodeVariant(variant: TicketFieldVariant) {
    return {
      locale: variant.locale,
      title: variant.title,
      titleForCustomerService: variant.titleForCustomerService,
      description: variant.description,
      options: variant.options,
    };
  }

  toJSON() {
    const data: Record<string, any> = {
      id: this.field.id,
      type: this.field.type,
      title: this.field.title,
      defaultLocale: this.field.defaultLocale,
      active: this.field.active,
      visible: this.field.visible,
      required: this.field.required,
      createdAt: this.field.createdAt,
      updatedAt: this.field.updatedAt,
    };

    const variants = this.field.variants ?? this.variants;
    if (variants) {
      data.variants = variants.map((v) => this.encodeVariant(v));
    }

    return data;
  }
}
