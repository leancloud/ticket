import AV from 'leancloud-storage';
import BasicService from './BasicService';
import { Locale } from './Field';
type FieldOption = [string | number, string | number];

export interface Variant {
  id: string;
  fieldId: string;
  locale: Locale;
  title: string;
  options?: FieldOption[];
}

class VariantModel implements Variant {
  id;
  fieldId;
  locale;
  title;
  options;
  constructor(data: Variant) {
    this.id = data.id;
    this.fieldId = data.fieldId;
    this.locale = data.locale;
    this.title = data.title;
    this.options = data.options;
  }

  static fromAVObject(obj: AV.Object) {
    return new VariantModel({
      id: obj.id!,
      fieldId: obj.get('field').id,
      locale: obj.get('locale'),
      title: obj.get('title'),
      options: obj.get('options'),
    });
  }
}

class VariantService extends BasicService<VariantModel> {
  constructor() {
    super('TicketFieldVariant', VariantModel);
  }
}

const service = new VariantService();
export default service;
