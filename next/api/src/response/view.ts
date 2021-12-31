import { View } from '@/model/View';

export class ViewResponse {
  constructor(private view: View) {}

  toJSON() {
    return {
      id: this.view.id,
      title: this.view.title,
      userIds: this.view.userIds,
      groupIds: this.view.groupIds,
      conditions: this.view.conditions,
      fields: this.view.fields,
      sortBy: this.view.sortBy,
      sortOrder: this.view.sortOrder,
      createdAt: this.view.createdAt.toISOString(),
      updatedAt: this.view.updatedAt.toISOString(),
    };
  }
}
