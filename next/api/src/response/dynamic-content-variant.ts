import { DynamicContent } from '@/model/DynamicContent';
import { DynamicContentVariant } from '@/model/DynamicContentVariant';

export class DynamicContentVariantResponse {
  constructor(readonly dc: DynamicContent, readonly variant: DynamicContentVariant) {}

  toJSON() {
    return {
      id: this.variant.id,
      locale: this.variant.locale,
      content: this.variant.content,
      active: this.variant.active,
      default: this.dc.defaultLocale === this.variant.locale,
      createdAt: this.variant.createdAt,
      updatedAt: this.variant.updatedAt,
    };
  }
}
