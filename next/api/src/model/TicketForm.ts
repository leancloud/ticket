import _ from 'lodash';

import { Model, field, hasManyThroughIdArray } from '@/orm';
import { TicketField } from './TicketField';
import { TicketFieldVariant } from './TicketFieldVariant';

export class TicketForm extends Model {
  @field()
  title!: string;

  @field()
  fieldIds!: string[];

  @hasManyThroughIdArray(() => TicketField)
  fields!: TicketField[];

  async getFields(): Promise<TicketField[]> {
    const fields = await TicketField.queryBuilder()
      .where('objectId', 'in', this.fieldIds)
      .where('active', '==', true)
      .where('visible', '==', true)
      .find({ useMasterKey: true });
    const fieldMap = _.keyBy(fields, 'id');

    const result: TicketField[] = [];
    for (const fieldId of this.fieldIds) {
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
    const variantsByFieldId = _.groupBy(variants, 'fieldId');

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
