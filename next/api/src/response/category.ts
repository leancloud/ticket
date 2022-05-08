import { Category } from '@/model/Category';
import { TicketFieldVariant } from '@/model/TicketFieldVariant';

export class CategoryResponse {
  constructor(readonly category: Category) {}

  toJSON() {
    return {
      id: this.category.id,
      name: this.category.name,
      description: this.category.description,
      alias: this.category.alias,
      parentId: this.category.parentId,
      position: this.category.order ?? this.category.createdAt.getTime(),
      active: !this.category.deletedAt,
      meta: this.category.meta,
      template: this.category.qTemplate,
      articleIds: this.category.FAQIds,
      noticeIds: this.category.noticeIds,
      formId: this.category.formId,
      groupId: this.category.groupId,
    };
  }
}

export class CategoryResponseForCS extends CategoryResponse {
  toJSON() {
    return {
      ...super.toJSON(),
      groupId: this.category.groupId,
    };
  }
}

export class CategoryFieldResponse {
  constructor(readonly variant: TicketFieldVariant) {}

  toJSON() {
    return {
      id: this.variant.fieldId,
      title: this.variant.title,
      description: this.variant.description ?? '',
      type: this.variant.field!.type,
      required: this.variant.field!.required,
      options: this.variant.options,
      meta: this.variant.field?.meta,
    };
  }
}
