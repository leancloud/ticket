import { redis } from '@/cache';
import { Category } from '@/model/Category';
import _ from 'lodash';

class CategoryCache {
  static readonly CACHE_KEY = 'categories';
  static readonly CACHE_TTL = 60 * 5; // 5 min

  static async setAll(categories: Category[]) {
    const pl = redis.pipeline();
    pl.del(CategoryCache.CACHE_KEY);
    categories.forEach((c) => pl.hset(CategoryCache.CACHE_KEY, c.id, JSON.stringify(c)));
    pl.expire(CategoryCache.CACHE_KEY, CategoryCache.CACHE_TTL);
    await pl.exec();
  }

  static async getAll(): Promise<Category[] | undefined> {
    const datas = await redis.hvals(CategoryCache.CACHE_KEY);
    if (datas.length) {
      return datas.map((data) => Category.fromJSON(JSON.parse(data)));
    }
  }

  static async get(id: string): Promise<Category | undefined> {
    const data = await redis.hget(CategoryCache.CACHE_KEY, id);
    if (data) {
      return Category.fromJSON(JSON.parse(data));
    }
  }

  static async clear() {
    await redis.del(CategoryCache.CACHE_KEY);
  }
}

export class CategoryService {
  static async getAll(): Promise<Category[]> {
    const cached = await CategoryCache.getAll();
    if (cached) {
      return cached;
    }

    const categories = await Category.queryBuilder().limit(1000).find();
    CategoryCache.setAll(categories).catch((error) => {
      // TODO(sdjdd): Sentry
      console.error(`[Cache] set categories failed:`, error);
    });
    return categories;
  }

  static async get(id: string): Promise<Category | undefined> {
    const cached = await CategoryCache.get(id);
    if (cached) {
      return cached;
    }

    const category = await Category.find(id);
    if (category) {
      CategoryCache.clear().catch((error) => {
        // TODO(sdjdd): Sentry
        console.error(`[Cache] clear categories failed:`, error);
      });
      return category;
    }
  }

  static async getSubCategories(id: string | string[]): Promise<Category[]> {
    const parentIds = _.castArray(id);
    const categories = await CategoryService.getAll();
    const categoriesByParentId = _.groupBy(categories, 'parentId');
    const subCategories: Category[] = [];

    while (parentIds.length) {
      const parentId = parentIds.shift()!;
      categoriesByParentId[parentId]?.forEach((category) => {
        parentIds.push(category.id);
        subCategories.push(category);
      });
    }

    return subCategories;
  }
}
