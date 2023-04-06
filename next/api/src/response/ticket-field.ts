import _ from 'lodash';

import type { FieldType, TicketField } from '@/model/TicketField';
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
      meta: this.field.meta,
      unused: this.field.unused,
      active: this.field.active,
      visible: this.field.visible,
      required: this.field.required,
      pattern: this.field.pattern,
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

export class TicketFieldVariantResponse {
  constructor(readonly variant: TicketFieldVariant) {}

  toJSON() {
    return {
      id: this.variant.fieldId,
      title: this.variant.title,
      description: this.variant.description ?? '',
      type: this.variant.field!.type,
      required: this.variant.field!.required,
      options: this.variant.options,
      meta: this.variant.field!.meta,
      pattern: this.variant.field!.pattern,
    };
  }
}

export interface TicketFieldStatsOptions {
  title: string;
  displayLocale: string;
  value: string;
  count: {
    open: number;
    closed: number;
    total: number;
  };
}

export interface TicketFieldStats {
  title: string;
  id: string;
  type: FieldType;
  options: TicketFieldStatsOptions[];
}

export type TicketFieldStatsResponse = TicketFieldStats[];
