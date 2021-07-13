import AV from 'leancloud-storage';

export interface CategoryData {
  id: string;
  name: string;
}

export class Category {
  readonly id: string;
  readonly name: string;

  constructor(data: CategoryData) {
    this.id = data.id;
    this.name = data.name;
  }

  static async getAll(): Promise<Category[]> {
    const query = new AV.Query<AV.Object>('Category');
    const objects = await query.find();
    return objects.map((obj) => {
      return new Category({
        id: obj.id!,
        name: obj.get('name'),
      });
    });
  }
}

export const INVALID_CATEGORY = new Category({
  id: '',
  name: '(DELETED)',
});
