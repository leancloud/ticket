import _ from 'lodash';

import { Model, field, hasManyThroughIdArray } from '@/orm';
import { TicketFormItem } from '@/ticket-form/types';
import { TicketField } from './TicketField';
import { TicketFieldVariant } from './TicketFieldVariant';
import { User } from './User';
import { LocaleMatcher, matchLocale } from '@/utils/locale';

export class TicketForm extends Model {
  @field()
  title!: string;

  @field()
  fieldIds!: string[];

  @hasManyThroughIdArray(() => TicketField)
  fields!: TicketField[];

  @field()
  items?: TicketFormItem[];

  async getFields(visibleOnly = false): Promise<TicketField[]> {
    const query = TicketField.queryBuilder()
      .where('objectId', 'in', this.fieldIds)
      .where('active', '==', true);
    if (visibleOnly) {
      query.where('visible', '==', true);
    }
    const fields = await query.find({ useMasterKey: true });
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

  async getFieldVariants(
    this: TicketForm,
    matcher: LocaleMatcher,
    currentUser?: User
  ): Promise<TicketFieldVariant[]> {
    const isCS = currentUser ? await currentUser.isCustomerService() : false;
    const fields = await this.getFields(!isCS);

    const fieldsById = _.keyBy(fields, 'id');

    const variants = await TicketFieldVariant.queryBuilder()
      .where(
        'field',
        'in',
        fields.map((f) => f.toPointer())
      )
      .find({ useMasterKey: true });

    return _(variants)
      .groupBy('fieldId')
      .mapValues((variantGroup, fieldId) => {
        const match = matchLocale(
          variantGroup,
          (v) => v.locale,
          matcher,
          fieldsById[fieldId].defaultLocale
        );

        if (!match) {
          throw new Error(
            `Ticket field has no variant of default locale(${fieldsById[fieldId].defaultLocale}), id=${fieldId}`
          );
        }

        match.field = fieldsById[fieldId];

        return match;
      })
      .values()
      .value();
  }

  getItems(): TicketFormItem[] {
    return this.items ?? this.fieldIds.map((id) => ({ type: 'field', id }));
  }
}
