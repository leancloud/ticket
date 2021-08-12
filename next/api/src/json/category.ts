import { Category } from '../model/category';

export class CategoryJson {
  constructor(readonly category: Category) {}

  toJSON() {
    return {
      id: this.category.id,
      name: this.category.name,
      parentId: this.category.parentId,
      position: this.category.order ?? this.category.createdAt.getTime(),
      active: !this.category.deletedAt,
    };
  }
}
