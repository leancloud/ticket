import AV from 'leancloud-storage';

import { redis } from '../../cache';
import { array2map } from '../../utils/convert';

const CACHE_KEY = 'categories';
const CACHE_TTL = 60 * 5; // 5 min

export interface CategoryData {
  id: string;
  name: string;
  parentId?: string;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class Category {
  id: string;
  name: string;
  parentId?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  constructor(data: CategoryData) {
    this.id = data.id;
    this.name = data.name;
    this.parentId = data.parentId;
    this.order = data.order ?? data.createdAt.getTime();
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  static fromJSON(data: any): Category {
    return new Category({
      id: data.id,
      name: data.name,
      parentId: data.parentId,
      order: data.order,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      deletedAt: data.deletedAt ? new Date(data.deletedAt) : undefined,
    });
  }

  static async getAllFromStorage(): Promise<Category[]> {
    const query = new AV.Query<AV.Object>('Category');
    const objects = await query.find();
    return objects.map((obj) => {
      return new Category({
        id: obj.id!,
        name: obj.get('name'),
        parentId: obj.get('parent')?.id ?? undefined,
        order: obj.get('order') ?? undefined,
        createdAt: obj.createdAt!,
        updatedAt: obj.updatedAt!,
        deletedAt: obj.get('deletedAt') ?? undefined,
      });
    });
  }

  static async getAllFromCache(): Promise<Category[] | null> {
    const cached = await redis.hvals(CACHE_KEY);
    if (cached.length === 0) {
      return null;
    }
    return cached.map((item) => Category.fromJSON(JSON.parse(item)));
  }

  static async setAllToCache(categories: Category[]) {
    await redis
      .pipeline()
      .del(CACHE_KEY)
      .hset(CACHE_KEY, ...categories.map((c) => [c.id, JSON.stringify(c.toJSON())]))
      .expire(CACHE_KEY, CACHE_TTL)
      .exec();
  }

  static async getAll(options?: { ignoreCache?: boolean }): Promise<Category[]> {
    if (!options?.ignoreCache) {
      const cached = await this.getAllFromCache();
      if (cached) {
        return cached;
      }
    }
    const categories = await this.getAllFromStorage();
    this.setAllToCache(categories).catch((error) => {
      // TODO(sdjdd): Sentry
      console.error(`[Cache] Set ${CACHE_KEY}:`, error);
    });
    return categories;
  }

  static async getSomeFromCache(ids: string[]): Promise<Category[] | null> {
    if (ids.length === 0) {
      return [];
    }
    const id_set = new Set(ids);
    const cached = await redis.hmget(CACHE_KEY, ...id_set);
    const cached_str = cached.filter((item) => item !== null) as string[];
    if (cached_str.length === 0) {
      return null;
    }
    return cached_str.map((str) => Category.fromJSON(JSON.parse(str)));
  }

  static async getSome(ids: string[]): Promise<Category[]> {
    if (ids.length === 0) {
      return [];
    }
    const id_set = new Set(ids);
    const cached = await this.getSomeFromCache(ids);
    if (cached && cached.length === id_set.size) {
      return cached;
    }
    const categories = await this.getAll({ ignoreCache: true });
    return categories.filter((c) => id_set.has(c.id));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      parentId: this.parentId,
      order: this.order,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}

export const INVALID_CATEGORY = new Category({
  id: '',
  name: '(unknown)',
  order: Number.MAX_SAFE_INTEGER,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  deletedAt: new Date(0),
});

export type CategoryPathItem = Pick<Category, 'id' | 'name'>;

export class Categories {
  private categoryMap: Record<string, Category>;
  private categoryPathMap: Record<string, CategoryPathItem[]> = {};

  constructor(categories: Category[]) {
    this.categoryMap = array2map(categories, 'id');
  }

  static async create(): Promise<Categories> {
    return new Categories(await Category.getAll());
  }

  get(id: string): Category {
    return this.categoryMap[id] ?? INVALID_CATEGORY;
  }

  getPath(id: string): CategoryPathItem[] {
    if (id in this.categoryPathMap) {
      return this.categoryPathMap[id];
    }

    let path: CategoryPathItem[];
    let current = this.get(id);
    if (current.parentId) {
      path = this.getPath(current.parentId).concat({ id: current.id, name: current.name });
    } else {
      path = [];
      while (current && current !== INVALID_CATEGORY) {
        path.unshift({ id: current.id, name: current.name });
        if (!current.parentId) {
          break;
        }
        current = this.get(current.parentId);
      }
    }

    this.categoryPathMap[id] = path;
    return path;
  }
}
