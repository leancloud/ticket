import AV from 'leancloud-storage';
import _ from 'lodash';

import { TicketField } from '../../model/ticket-field';
import { TicketFieldVariant } from '../ticket-field-variant';
import { getAvailableLocales } from './utils';

const presetFieldTitle = new TicketField({
  id: 'title',
  title: 'Title',
  type: 'text',
  active: true,
  defaultLocale: 'en',
  required: true,
});

const presetFieldVariantTitle = new TicketFieldVariant({
  id: 'title',
  fieldId: 'title',
  locale: 'en',
  title: 'Title',
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const presetFieldDescription = new TicketField({
  id: 'description',
  title: 'Description',
  type: 'multi-line',
  active: true,
  defaultLocale: 'en',
  required: true,
});

const presetFieldVariantDescription = new TicketFieldVariant({
  id: 'description',
  fieldId: 'description',
  locale: 'en',
  title: 'Description',
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const presetFieldIds = ['title', 'description'];

export class TicketForm {
  id: string;
  title: string;
  fieldIds: string[];
  fields?: TicketField[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    title: string;
    fieldIds: string[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.title = data.title;
    this.fieldIds = data.fieldIds;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromAVObject(object: AV.Object) {
    return new TicketForm({
      id: object.id!,
      title: object.get('title'),
      fieldIds: object.get('fieldIds'),
      createdAt: object.createdAt!,
      updatedAt: object.updatedAt!,
    });
  }

  static async find(id: string): Promise<TicketForm | undefined> {
    const query = new AV.Query<AV.Object>('TicketForm').equalTo('objectId', id);
    const object = await query.first({ useMasterKey: true });
    if (object) {
      return TicketForm.fromAVObject(object);
    }
  }

  async getFields() {
    if (!this.fields) {
      const fields = await TicketField.query()
        .where(
          'objectId',
          'in',
          this.fieldIds.filter((id) => !presetFieldIds.includes(id))
        )
        .get({ useMasterKey: true });

      const fieldMap = new Map<string, TicketField>();
      fields.forEach((field) => fieldMap.set(field.id, field));
      fieldMap.set('title', presetFieldTitle);
      fieldMap.set('description', presetFieldDescription);

      const fieldIds = [...this.fieldIds];
      if (!fieldIds.includes('title')) {
        fieldIds.unshift('title');
      }
      if (!fieldIds.includes('description')) {
        fieldIds.push('description');
      }

      const result: TicketField[] = [];
      fieldIds.forEach((fieldId) => {
        const field = fieldMap.get(fieldId);
        if (field) {
          result.push(field);
        }
      });

      this.fields = result;
    }
    return this.fields;
  }

  async getFieldVariants(locale: string) {
    const fields = await this.getFields();
    const locales = fields.map((f) => f.defaultLocale).concat(getAvailableLocales(locale));
    const query = TicketFieldVariant.query()
      .where(
        'field',
        'in',
        fields.map((f) => f.toPointer())
      )
      .where('locale', 'in', _.uniq(locales));
    const variants = await query.get({ useMasterKey: true });

    const variantsByFieldId: Record<string, TicketFieldVariant[]> = {
      title: [presetFieldVariantTitle],
      description: [presetFieldVariantDescription],
    };
    variants.forEach((variant) => {
      if (variant.fieldId in variantsByFieldId) {
        variantsByFieldId[variant.fieldId].push(variant);
      } else {
        variantsByFieldId[variant.fieldId] = [variant];
      }
    });

    const result: TicketFieldVariant[] = [];

    for (const field of fields) {
      const variants = variantsByFieldId[field.id];
      if (!variants) {
        continue;
      }

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
