import { DynamicContentVariant } from '@/model/DynamicContentVariant';

export class DynamicContentVariantResponse {
  constructor(readonly variant: DynamicContentVariant) {}

  toJSON() {
    return {
      id: this.variant.id,
      locale: this.variant.locale,
      content: this.variant.content,
      active: this.variant.active,
      createdAt: this.variant.createdAt,
      updatedAt: this.variant.updatedAt,
    };
  }
}
