import AV from 'leancloud-storage';
import { Query } from '../../query';

export class TicketField {
  static className = 'TicketField';

  id: string;
  title: string;
  type: string;
  active: boolean;
  defaultLocale: string;
  required: boolean;

  constructor(data: {
    id: string;
    title: string;
    type: string;
    active: boolean;
    defaultLocale: string;
    required: boolean;
  }) {
    this.id = data.id;
    this.title = data.title;
    this.type = data.type;
    this.active = data.active;
    this.defaultLocale = data.defaultLocale;
    this.required = data.required;
  }

  static fromAVObject(object: AV.Object) {
    return new TicketField({
      id: object.id!,
      title: object.get('title'),
      type: object.get('type'),
      active: object.get('active'),
      defaultLocale: object.get('defaultLocale'),
      required: object.get('required'),
    });
  }

  static query() {
    return new Query(TicketField);
  }

  toPointer() {
    return { __type: 'Pointer', className: TicketField.className, objectId: this.id };
  }
}
