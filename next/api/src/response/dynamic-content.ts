import { DynamicContent } from '@/model/DynamicContent';

export class DynamicContentResponse {
  constructor(readonly dc: DynamicContent) {}

  toJSON() {
    return {
      id: this.dc.id,
      name: this.dc.name,
      defaultLocale: this.dc.defaultLocale,
      createdAt: this.dc.createdAt,
      updatedAt: this.dc.updatedAt,
    };
  }
}
