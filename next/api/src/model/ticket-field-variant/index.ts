import AV from 'leancloud-storage';

import { Query } from '../../query';
import { TicketField } from '../ticket-field';

export class TicketFieldVariant {
  static className = 'TicketFieldVariant';

  id: string;
  title: string;
  fieldId: string;
  field?: TicketField;
  locale: string;
  options?: [string, string][];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    title: string;
    fieldId: string;
    locale: string;
    options?: [string, string][];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.title = data.title;
    this.fieldId = data.fieldId;
    this.locale = data.locale;
    this.options = data.options ?? undefined;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromAVObject(object: AV.Object) {
    return new TicketFieldVariant({
      id: object.id!,
      title: object.get('title'),
      fieldId: object.get('field').id,
      locale: object.get('locale'),
      options: object.get('options'),
      createdAt: object.createdAt!,
      updatedAt: object.updatedAt!,
    });
  }

  static fromJSON(data: any) {
    return new TicketFieldVariant({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }

  static query() {
    return new Query(TicketFieldVariant);
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      fieldId: this.fieldId,
      locale: this.locale,
      options: this.options,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
