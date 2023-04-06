import AV from 'leancloud-storage';
import _ from 'lodash';

import { Model, CreateData, field, hasManyThroughPointer } from '@/orm';
import { TicketFieldVariant } from './TicketFieldVariant';

type VariantData = Pick<
  CreateData<TicketFieldVariant>,
  'locale' | 'title' | 'titleForCustomerService' | 'description' | 'options'
>;

export const FIELD_TYPES = [
  'text',
  'multi-line',
  'dropdown',
  'multi-select',
  'radios',
  'file',
  'number',
  'date',
] as const;

export type FieldType = typeof FIELD_TYPES[number];

export const OPTION_TYPES: FieldType[] = ['dropdown', 'multi-select', 'radios'];

export class TicketField extends Model {
  @field()
  title!: string;

  @field()
  type!: FieldType;

  @field()
  defaultLocale!: string;

  @field()
  active!: boolean;

  @field()
  visible!: boolean;

  @field()
  required!: boolean;

  @field()
  meta?: Record<string, any>;

  @field()
  pattern?: string;

  unused?: boolean;

  @hasManyThroughPointer(() => TicketFieldVariant, 'field')
  variants?: TicketFieldVariant[];

  /**
   * @deprecated
   * 推荐使用
   * ```ts
   * field.load('variants');
   * ```
   */
  getVariants(): Promise<TicketFieldVariant[]> {
    return TicketFieldVariant.queryBuilder()
      .where('field', '==', this.toPointer())
      .orderBy('createdAt', 'asc')
      .find({ useMasterKey: true });
  }

  async appendVariants(variants: VariantData[]) {
    const ACL = {};
    const fieldId = this.id;
    await TicketFieldVariant.createSome(
      variants.map((variant) => ({
        ACL,
        fieldId,
        locale: variant.locale,
        title: variant.title,
        titleForCustomerService: variant.titleForCustomerService,
        description: variant.description,
        options: variant.options,
      })),
      { useMasterKey: true }
    );
  }

  async removeVariants() {
    const variants = await this.getVariants();
    if (variants.length === 0) {
      return;
    }
    const objects = variants.map((v) => AV.Object.createWithoutData(v.className, v.id));
    await AV.Object.destroyAll(objects, { useMasterKey: true });
  }

  async replaceVariants(variants: VariantData[]) {
    await this.removeVariants();
    await this.appendVariants(variants);
  }
}
