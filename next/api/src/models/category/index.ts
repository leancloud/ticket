import AV from 'leancloud-storage';

import { redis } from '../../cache';

const CACHE_KEY = 'categories';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export interface CategoryData {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  parents?: { id: string; name: string }[];
  template?: string;
  order?: number;
  faqIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class Category {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly parentId?: string;
  readonly parents: { id: string; name: string }[];
  readonly template: string;
  readonly order: number;
  readonly faqIds?: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
  readonly active: boolean;

  constructor(data: CategoryData) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description ?? '';
    this.parentId = data.parentId;
    this.template = data.template ?? '';
    this.order = data.order ?? data.createdAt.getTime();
    this.parents = data.parents ?? [];
    this.faqIds = data.faqIds ?? [];
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
    this.active = !!data.deletedAt;
  }

  static fromJSON(data: ReturnType<Category['toJSON']>): Category {
    return new Category({
      id: data.id,
      name: data.name,
      description: data.description,
      parentId: data.parentId,
      template: data.template,
      order: data.order,
      parents: data.parents,
      faqIds: data.faqIds,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      deletedAt: data.deletedAt ? new Date(data.deletedAt) : undefined,
    });
  }

  static async getAllFromCache(): Promise<Category[] | null> {
    const categories = await redis.hvals(CACHE_KEY);
    if (categories.length === 0) {
      return null;
    }
    return categories.map((data) => Category.fromJSON(JSON.parse(data)));
  }

  private static async fillCache(categories: Category[]) {
    await redis
      .pipeline()
      .hdel(CACHE_KEY)
      .hset(CACHE_KEY, ...categories.map((c) => [c.id, JSON.stringify(c)]))
      .expire(CACHE_KEY, CACHE_TTL)
      .exec();
  }

  static async flushCache() {
    await redis.hdel(CACHE_KEY);
  }

  static async getAll(): Promise<Category[]> {
    const cached = await this.getAllFromCache();
    if (cached) {
      return cached;
    }

    const query = new AV.Query<AV.Object>('Category');
    const objects = await query.find();
    const categories = objects.map((obj) => {
      return new Category({
        id: obj.id!,
        name: obj.get('name'),
        description: obj.get('description'),
        parentId: obj.get('parent')?.id,
        template: obj.get('qTemplate'),
        order: obj.get('order'),
        faqIds: obj.get('FAQs')?.map((o: AV.Object) => o.id),
        createdAt: obj.createdAt!,
        updatedAt: obj.updatedAt!,
        deletedAt: obj.get('deletedAt'),
      });
    });

    const categoryMap = categories.reduce<Record<string, Category>>((map, category) => {
      map[category.id] = category;
      return map;
    }, {});
    categories.forEach((category) => {
      let cur = category;
      while (cur.parentId) {
        const parent = categoryMap[cur.parentId];
        if (!parent) {
          break;
        }
        category.parents.unshift({ id: parent.id, name: parent.name });
        cur = parent;
      }
    });

    this.fillCache(categories);

    return categories;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description || undefined,
      parentId: this.parentId,
      template: this.template || undefined,
      order: this.order,
      parents: this.parents.length ? this.parents : undefined,
      faqIds: this.faqIds || undefined,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      deletedAt: this.deletedAt?.toISOString(),
    };
  }
}

export const INVALID_CATEGORY = new Category({
  id: '',
  name: '(DELETED)',
  createdAt: new Date(0),
  updatedAt: new Date(0),
});
