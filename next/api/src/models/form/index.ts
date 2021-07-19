import AV from 'leancloud-storage';

import { array2map } from '../../utils/convert';

export interface TicketFieldData {
  id: string;
  title: string;
  type: string;
  active: boolean;
  defaultLocale: string;
  required?: boolean;
}

export class TicketField {
  id: string;
  title: string;
  type: string;
  active: boolean;
  defaultLocale: string;
  required: boolean;

  constructor(data: TicketFieldData) {
    this.id = data.id;
    this.title = data.title;
    this.type = data.type;
    this.active = data.active;
    this.defaultLocale = data.defaultLocale;
    this.required = !!data.required;
  }

  static pointer(id: string) {
    return AV.Object.createWithoutData('TicketField', id);
  }

  async getSome(ids: string[]): Promise<TicketField[]> {
    const query = new AV.Query<AV.Object>('TicketField');
    query.containedIn('objectId', ids);
    const objects = await query.find({ useMasterKey: true });
    return objects.map((obj) => {
      return new TicketField({
        id: obj.id!,
        title: obj.get('title'),
        type: obj.get('type'),
        active: obj.get('active'),
        defaultLocale: obj.get('defaultLocale'),
        required: obj.get('required'),
      });
    });
  }

  toPointer() {
    return AV.Object.createWithoutData('TicketField', this.id);
  }
}

export interface TicketFieldOption {
  title: string;
  value: string;
}

export interface TicketFieldVariantData {
  id: string;
  locale: string;
  title: string;
  type: string;
  required?: boolean;
  options?: TicketFieldOption[];
}

export class TicketFieldVariant {
  id: string;
  locale: string;
  title: string;
  type: string;
  required: boolean;
  options?: TicketFieldOption[];

  constructor(data: TicketFieldVariantData) {
    this.id = data.id;
    this.locale = data.locale;
    this.title = data.title;
    this.type = data.type;
    this.required = !!data.required;
    this.options = data.options;
  }
}

export interface TicketFormData {
  id: string;
  title: string;
  fieldIds: string[];
}

export class TicketForm {
  id: string;
  title: string;
  fieldIds: string[];

  constructor(data: TicketFormData) {
    this.id = data.id;
    this.title = data.title;
    this.fieldIds = data.fieldIds;
  }

  static fromAVObject(object: AV.Object) {
    // TODO(sdjdd): check attributes
    return new TicketForm({
      id: object.id!,
      title: object.get('title'),
      fieldIds: object.get('fieldIds'),
    });
  }

  static fromJSON(data: any) {
    return new TicketForm(data);
  }

  async getFields(): Promise<TicketField[]> {
    const query = new AV.Query<AV.Object>('TicketField');
    query.containedIn('objectId', this.fieldIds);
    const objects = await query.find({ useMasterKey: true });
    const fieldMap: Record<string, TicketField> = {};
    objects.forEach((obj) => {
      fieldMap[obj.id!] = new TicketField({
        id: obj.id!,
        title: obj.get('title'),
        type: obj.get('type'),
        active: obj.get('active'),
        defaultLocale: obj.get('defaultLocale'),
        required: obj.get('required'),
      });
    });
    const fields: TicketField[] = [];
    this.fieldIds.forEach((id) => {
      const field = fieldMap[id];
      if (field) {
        fields.push(field);
      }
    });
    return fields;
  }

  async getFieldVariants(locale: string): Promise<TicketFieldVariant[]> {
    const fields = await this.getFields();
    const field_map = array2map(fields, 'id');
    const locale_set = new Set(
      getAvailableLocales(locale).concat(fields.map((f) => f.defaultLocale))
    );

    const query = new AV.Query<AV.Object>('TicketFieldVariant');
    query.containedIn(
      'field',
      fields.map((f) => f.toPointer())
    );
    query.containedIn('locale', Array.from(locale_set));
    const objects = await query.find({ useMasterKey: true });

    const fieldVariants_map: Record<string, TicketFieldVariant[]> = {};
    objects.forEach((obj) => {
      const fieldId = obj.get('field').id as string;
      const field = field_map[fieldId];
      const variant = new TicketFieldVariant({
        id: obj.id!,
        locale: obj.get('locale'),
        title: obj.get('title'),
        type: field.type,
        required: field.required,
        options: (obj.get('options') as [string, string][])?.map(optionTupleToObject),
      });

      if (fieldVariants_map[fieldId]) {
        fieldVariants_map[fieldId].push(variant);
      } else {
        fieldVariants_map[fieldId] = [variant];
      }
    });

    const fieldVariants: TicketFieldVariant[] = [];
    for (const field of fields) {
      const variants = fieldVariants_map[field.id];
      if (!variants) continue;

      let exactLocal: TicketFieldVariant | undefined;
      let defaultLocale: TicketFieldVariant | undefined;
      let fallbackLocale: TicketFieldVariant | undefined;
      for (const variant of variants) {
        if (variant.locale === locale) {
          exactLocal = variant;
          break;
        }
        if (variant.locale === field.defaultLocale) {
          defaultLocale = variant;
        }
        if (locale.startsWith(variant.locale)) {
          fallbackLocale = variant;
        }
      }

      if (exactLocal) {
        fieldVariants.push(exactLocal);
      } else {
        if (!defaultLocale) {
          throw new Error(
            `Ticket field ${field.id} has no variant of default locale (${field.defaultLocale})`
          );
        }
        fieldVariants.push(fallbackLocale ?? defaultLocale);
      }
    }
    return fieldVariants;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      fieldIds: this.fieldIds,
    };
  }
}

function getAvailableLocales(locale: string): string[] {
  const locales: string[] = [locale];
  const index = locale.indexOf('-');
  if (index > 0) {
    locales.push(locale.slice(0, index));
  }
  return locales;
}

function optionTupleToObject([value, title]: [string, string]): TicketFieldOption {
  return { title, value };
}
