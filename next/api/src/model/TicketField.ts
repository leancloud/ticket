import AV from 'leancloud-storage';
import _ from 'lodash';

import { Model, CreateData, field } from '@/orm';
import { TicketFieldVariant } from './TicketFieldVariant';

type VariantsData = Record<
  string,
  Pick<CreateData<TicketFieldVariant>, 'title' | 'description' | 'options'>
>;

export const FIELD_TYPES = [
  'text',
  'multi-line',
  'dropdown',
  'multi-select',
  'radios',
  'file',
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
  required!: boolean;

  getVariants(): Promise<TicketFieldVariant[]> {
    return TicketFieldVariant.queryBuilder()
      .where('field', '==', this.toPointer())
      .find({ useMasterKey: true });
  }

  async appendVariants(variants: VariantsData) {
    const ACL = {};
    const fieldId = this.id;
    await TicketFieldVariant.createSome(
      Object.entries(variants).map(([locale, variant]) => ({
        ACL,
        fieldId,
        locale,
        title: variant.title,
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

  async replaceVariants(variants: VariantsData) {
    await this.removeVariants();
    await this.appendVariants(variants);
  }
}
