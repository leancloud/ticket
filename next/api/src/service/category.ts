import _ from 'lodash';
import mem from 'mem';

import { redis } from '@/cache';
import { HttpError } from '@/common/http';
import { AuthOptions, ACLBuilder, CreateData, UpdateData } from '@/orm';
import { Category } from '@/model/Category';

class CategoryCache {
  static readonly CACHE_KEY = 'categories';
  static readonly CACHE_TTL = 60 * 5; // 5 min

  static async setAll(categories: Category[]) {
    const pl = redis.pipeline();
    pl.del(CategoryCache.CACHE_KEY);
    categories.forEach((c) => {
      const value = JSON.stringify(c);
      pl.hset(CategoryCache.CACHE_KEY, c.id, value);
      if (c.alias) {
        pl.hset(CategoryCache.CACHE_KEY, c.alias, value);
      }
    });
    pl.expire(CategoryCache.CACHE_KEY, CategoryCache.CACHE_TTL);
    await pl.exec();
  }

  static async getAll(): Promise<Category[] | undefined> {
    const datas = await redis.hvals(CategoryCache.CACHE_KEY);
    if (datas.length) {
      return _.uniqBy(
        datas.map((data) => Category.fromJSON(JSON.parse(data))),
        'id'
      );
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

  static async create(data: CreateData<Category>, options?: AuthOptions) {
    const ACL = new ACLBuilder().allow('*', 'read').allowCustomerService('write');
    const category = await Category.create({ ...data, ACL }, options);
    await CategoryCache.clear();
    return category;
  }

  static async batchUpdate(
    datas: (UpdateData<Category> & { id: string })[],
    options?: AuthOptions
  ) {
    if (datas.length === 0) {
      return;
    }

    const categories = await Category.queryBuilder().limit(1000).find();
    const categoryById = _.keyBy(categories, 'id');
    const childrenById = _.groupBy(categories, 'parentId');

    const hasActiveChildren = mem((category: Category) => {
      const children = childrenById[category.id];
      if (children) {
        for (const child of children) {
          if (child.deletedAt === undefined || hasActiveChildren(child)) {
            return true;
          }
        }
      }
      return false;
    });

    const pairs: [Category, UpdateData<Category>][] = [];
    datas.forEach(({ id, ...data }) => {
      const category = categoryById[id];
      if (!category) {
        throw new HttpError(404, `Category ${id} does not exist`);
      }
      if (data.deletedAt !== undefined && hasActiveChildren(category)) {
        throw new HttpError(400, `Category ${id} has active subcategories`);
      }
      pairs.push([category, data]);
    });

    if (pairs.length === 1) {
      const [category, data] = pairs[0];
      await category.update(data, options);
    } else {
      await Category.updateSome(pairs, options);
    }

    await CategoryCache.clear();
  }
}
