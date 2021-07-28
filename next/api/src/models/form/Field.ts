import AV from 'leancloud-storage';
import BasicService from './BasicService';
import variantService, { Variant } from './FieldVariant';

export type Locale =
  | 'zh-cn'
  | 'zh-tw'
  | 'zh-hk'
  | 'en'
  | 'ja'
  | 'ko'
  | 'id'
  | 'th'
  | 'de'
  | 'fr'
  | 'ru'
  | 'es'
  | 'pt'
  | 'tr';
export const LOCALES: Locale[] = [
  'zh-cn',
  'zh-tw',
  'zh-hk',
  'en',
  'ja',
  'ko',
  'id',
  'th',
  'de',
  'fr',
  'ru',
  'es',
  'pt',
  'tr',
];
export type FieldType =
  | 'dropdown'
  | 'text'
  | 'multi-line'
  | 'multi-select'
  | 'checkbox'
  | 'radios'
  | 'file';
export const FIELD_TYPES: FieldType[] = [
  'dropdown',
  'text',
  'multi-line',
  'multi-select',
  'checkbox',
  'radios',
  'file',
];

interface FieldData {
  id: string;
  title: string;
  type: FieldType;
  active: boolean;
  required?: boolean;
  defaultLocale: Locale;
  createdAt?: Date;
  updatedAt?: Date;
}

class FieldModel implements FieldData {
  id;
  title;
  type;
  active;
  defaultLocale;
  required;
  createdAt;
  updatedAt;
  constructor(data: FieldData) {
    this.id = data.id;
    this.title = data.title;
    this.type = data.type;
    this.active = data.active;
    this.defaultLocale = data.defaultLocale;
    this.required = !!data.required;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromAVObject(obj: AV.Object) {
    return new FieldModel({
      id: obj.id!,
      title: obj.get('title'),
      type: obj.get('type'),
      active: obj.get('active'),
      defaultLocale: obj.get('defaultLocale'),
      required: obj.get('required'),
      createdAt: obj.get('createdAt'),
      updatedAt: obj.get('updatedAt'),
    });
  }
}

class FieldService extends BasicService<FieldModel> {
  constructor() {
    super('TicketField', FieldModel);
  }

  async saveWithVariants(
    data: Pick<FieldData, 'type' | 'title' | 'required' | 'defaultLocale'>,
    variants: Pick<Variant, 'locale' | 'options' | 'title'>[]
  ) {
    const fieldResult = await this.save({
      ...data,
      active: true,
    });
    const variantsResult = await variantService.saveList(
      variants.map((variant) => ({
        ...variant,
        field: this.toAVObject(fieldResult.id),
      }))
    );
    return {
      ...fieldResult,
      variants: variantsResult,
    };
  }

  async updateWithVariants(
    id: string,
    data?: Partial<Pick<FieldData, 'type' | 'title' | 'required' | 'defaultLocale'>>,
    variants?: Partial<Pick<Variant, 'locale' | 'options' | 'title'>>[]
  ) {
    const fieldResult = data ? await this.update(id, data) : { id };
    if (!variants) {
      return fieldResult;
    }
    await variantService.deleteBy([
      {
        method: 'equalTo',
        value: this.toAVObject(id),
        field: 'field',
      },
    ]);
    const variantsResult = await variantService.saveList(
      variants.map((variant) => ({
        ...variant,
        field: this.toAVObject(id),
      }))
    );
    return {
      ...fieldResult,
      variants: variantsResult,
    };
  }

  async getDetail(id: string) {
    const field = await super.get(id);
    const variants = await variantService.find(
      [
        {
          field: 'field',
          method: 'equalTo',
          value: super.toAVObject(field.id),
        },
      ],
      undefined,
      [
        {
          key: 'locale',
          order: 'asc',
        },
      ]
    );
    return {
      ...field,
      variants,
    };
  }

  async getDetailList(ids: string[]) {
    const fields = await super.find([
      {
        field: 'objectId',
        method: 'containedIn',
        value: ids,
      },
    ]);
    const variants = await variantService.find([
      {
        field: 'field',
        method: 'containedIn',
        value: ids.map((id) => super.toAVObject(id)),
      },
    ]);
    return fields.map((field) => ({
      ...field,
      variants: variants.filter((variant) => variant.fieldId === field.id),
    }));
  }

  async delete(id: string) {
    await this.update(id, { active: false });
    return { id };
  }
}

const service = new FieldService();

export default service;
