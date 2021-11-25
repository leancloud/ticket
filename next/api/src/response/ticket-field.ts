import _ from 'lodash';

import type { TicketField } from '@/model/TicketField';
import type { TicketFieldVariant } from '@/model/TicketFieldVariant';

export class TicketFieldResponse {
  constructor(readonly field: TicketField, readonly variants?: TicketFieldVariant[]) {}

  toJSON() {
    const data: Record<string, any> = {
      id: this.field.id,
      type: this.field.type,
      title: this.field.title,
      defaultLocale: this.field.defaultLocale,
      active: this.field.active,
      required: this.field.required,
      createdAt: this.field.createdAt,
      updatedAt: this.field.updatedAt,
    };

    if (this.variants) {
      data.variants = _.mapValues(
        _.keyBy(this.variants, (v) => v.locale),
        (v) => ({
          title: v.title,
          description: v.description,
          options: v.options,
        })
      );
    }

    return data;
  }
}
