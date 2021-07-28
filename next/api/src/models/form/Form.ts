import AV from 'leancloud-storage';
import BasicService from './BasicService';
import fieldService, { Locale } from './Field';

export interface FormData {
  id: string;
  title: string;
  fieldIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

class FormModel implements FormData {
  id;
  title;
  fieldIds;
  createdAt;
  updatedAt;
  constructor(data: FormData) {
    this.id = data.id;
    this.title = data.title;
    this.fieldIds = data.fieldIds;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromAVObject(obj: AV.Object) {
    return new FormModel({
      id: obj.id!,
      title: obj.get('title'),
      fieldIds: obj.get('fieldIds'),
      createdAt: obj.get('createdAt'),
      updatedAt: obj.get('updatedAt'),
    });
  }
}

class FormService extends BasicService<FormModel> {
  constructor() {
    super('TicketForm', FormModel);
  }
  async getDetail(id: string, locale?: Locale) {
    const { fieldIds, ...rest } = await super.get(id);
    const list = await fieldService.getDetailList(fieldIds);
    const fields = fieldIds
      .map((fieldId) => {
        const filterData = list.filter((data) => data.active && data.id === fieldId);
        if (!filterData || !filterData[0]) {
          return;
        }
        const { variants, ...filterRest } = filterData[0];
        const filterVariantsData = variants.filter((variantData) => {
          if (locale) {
            return variantData.locale === locale;
          }
          return variantData.locale === filterRest.defaultLocale;
        });
        return {
          ...filterRest,
          variant: filterVariantsData[0]
            ? {
                locale: filterVariantsData[0].locale,
                options: filterVariantsData[0].options,
                title: filterVariantsData[0].title,
              }
            : undefined,
        };
      })
      .filter((v) => v);
    return {
      ...rest,
      fields,
    };
  }
}

const service = new FormService();
export default service;
