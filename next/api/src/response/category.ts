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
      hidden: this.category.hidden,
      meta: this.category.meta,
      template: this.category.qTemplate,
      articleIds: this.category.FAQIds,
      noticeIds: this.category.noticeIds,
      topicIds: this.category.topicIds,
      formId: this.category.formId,
      groupId: this.category.groupId,
      articleId: this.category.articleId,
      isTicketEnabled: this.category.isTicketEnabled,
      ticketDescription: this.category.ticketDescription,
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
