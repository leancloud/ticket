import { Category } from '@/model/Category';

export class CategoryResponse {
  constructor(readonly category: Category) {}

  toJSON() {
    return {
      id: this.category.id,
      name: this.category.name,
      rawName: this.category.rawName,
      description: this.category.description,
      alias: this.category.alias,
      parentId: this.category.parentId,
      position: this.category.order ?? this.category.createdAt.getTime(),
      active: !this.category.deletedAt,
      meta: this.category.meta,
      template: this.category.qTemplate,
      articleIds: this.category.FAQIds,
      noticeIds: this.category.noticeIds,
      topicIds: this.category.topicIds,
      formId: this.category.formId,
      groupId: this.category.groupId,
    };
  }
}
