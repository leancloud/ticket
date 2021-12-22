import _ from 'lodash';

import { Model, field, hasManyThroughIdArray } from '@/orm';
import { TicketField } from './TicketField';
import { TicketFieldVariant } from './TicketFieldVariant';

const title = new TicketField();
title.id = 'title';
title.title = 'title';
title.type = 'text';
title.defaultLocale = 'en';
title.active = true;
title.required = true;
title.createdAt = new Date(0);
title.updatedAt = new Date(0);

const description = new TicketField();
description.id = 'description';
description.title = 'description';
description.type = 'multi-line';
description.defaultLocale = 'en';
description.active = true;
description.required = true;
description.createdAt = new Date(0);
description.updatedAt = new Date(0);

export const presetTicketFields = [title, description];
const presetTicketFieldVariants = presetTicketFields.map((field) => {
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

export class TicketForm extends Model {
  @field()
  title!: string;

  @field()
  fieldIds!: string[];

  @hasManyThroughIdArray(() => TicketField)
  fields!: TicketField[];

  // 返回结果包含内置字段（title 、description）
  async getFields(): Promise<TicketField[]> {
    const fields = await TicketField.queryBuilder()
      .where(
        'objectId',
        'in',
        _.difference(
          this.fieldIds,
          presetTicketFields.map((f) => f.id)
        )
      )
      .where('active', '==', true)
      .where('visible', '==', true)
      .find({ useMasterKey: true });
    const fieldMap = _.keyBy(presetTicketFields.concat(fields), 'id');

    const fieldIds = [...this.fieldIds];
    if (!fieldIds.includes('title')) {
      fieldIds.unshift('title');
    }
    if (!fieldIds.includes('description')) {
      fieldIds.push('description');
    }

    const result: TicketField[] = [];
    for (const fieldId of fieldIds) {
      const field = fieldMap[fieldId];
      if (field) {
        result.push(field);
      }
    }
    return result;
  }

  async getFieldVariants(this: TicketForm, locale: string): Promise<TicketFieldVariant[]> {
    const fields = await this.getFields();
    const locales = fields.map((f) => f.defaultLocale).concat(getAvailableLocales(locale));
    const variants = await TicketFieldVariant.queryBuilder()
      .where(
        'field',
        'in',
        fields.map((f) => f.toPointer())
      )
      .where('locale', 'in', _.uniq(locales))
      .find({ useMasterKey: true });
    const variantsByFieldId = _.groupBy(presetTicketFieldVariants.concat(variants), 'fieldId');

    const result: TicketFieldVariant[] = [];

    for (const field of fields) {
      const variants = variantsByFieldId[field.id];
      if (!variants) continue;

      let preferedVariant: TicketFieldVariant | undefined;
      let defaultVariant: TicketFieldVariant | undefined;
      let fallbackVariant: TicketFieldVariant | undefined;

      for (const variant of variants) {
        variant.field = field;
        if (variant.locale === locale) {
          preferedVariant = variant;
          break;
        } else if (variant.locale === field.defaultLocale) {
          defaultVariant = variant;
        } else if (locale.startsWith(variant.locale)) {
          fallbackVariant = variant;
        }
      }

      if (preferedVariant) {
        result.push(preferedVariant);
      } else if (fallbackVariant) {
        result.push(fallbackVariant);
      } else {
        if (!defaultVariant) {
          throw new Error(
            `Ticket field has no variant of default locale(${field.defaultLocale}), id=${field.id}`
          );
        }
        result.push(defaultVariant);
      }
    }

    return result;
  }
}

function getAvailableLocales(locale: string): string[] {
  const index = locale.indexOf('-');
  if (index > 0) {
    return [locale, locale.slice(0, index)];
  }
  return [locale];
}
