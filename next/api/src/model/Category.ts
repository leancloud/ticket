import mem from 'mem';
import _ from 'lodash';
import QuickLRU from 'quick-lru';

import { redis } from '@/cache';
import { Model, field, pointerIds, pointerId, pointTo, serialize } from '@/orm';
import { Article } from './Article';
import { Group } from './Group';
import { TicketForm } from './TicketForm';

export interface TinyCategoryInfo {
  objectId: string;
  name: string;
}

export class Category extends Model {
  @field()
  @serialize()
  name!: string;

  @field()
  @serialize()
  description?: string;

  @field()
  @serialize()
  qTemplate?: string;

  @pointerId(() => Category)
  @serialize()
  parentId?: string;

  @pointTo(() => Category)
  parent?: Category;

  @field()
  @serialize()
  order?: number;

  @pointerIds(() => Article)
  @serialize()
  FAQIds?: string[];

  @pointerId(() => Group)
  @serialize()
  groupId?: string;

  @pointTo(() => Group)
  group?: Group;

  @pointerId(() => TicketForm)
  @serialize()
  formId?: string;

  @pointTo(() => TicketForm)
  form?: TicketForm;

  @field()
  @serialize.Date()
  deletedAt?: Date;

  getTinyInfo(): TinyCategoryInfo {
    return {
      objectId: this.id,
      name: this.name,
    };
  }
}

class RedisCache {
  static CACHE_KEY = 'categories';
  static CACHE_TTL = 60 * 5; // 5 min;

  private static async fetch(): Promise<Category[] | undefined> {
    const data = await redis.hvals(RedisCache.CACHE_KEY);
    if (data.length) {
      return data.map((item) => Category.fromJSON(JSON.parse(item)));
    }
  }

  private static async set(categories: Category[]) {
    const p = redis.pipeline();
    p.del(RedisCache.CACHE_KEY);
    categories.forEach((c) => p.hset(RedisCache.CACHE_KEY, c.id, JSON.stringify(c)));
    p.expire(RedisCache.CACHE_KEY, RedisCache.CACHE_TTL);
    await p.exec();
  }

  static async get(): Promise<Category[]> {
    const cached = await RedisCache.fetch();
    if (cached) {
      return cached;
    }

    const categories = await Category.queryBuilder().limit(1000).find();
    RedisCache.set(categories).catch((error) => {
      // TODO(sdjdd): Sentry
      console.error(`[Cache] Set ${RedisCache.CACHE_KEY} failed:`, error);
    });
    return categories;
  }
}

const getCategoryMap = mem((categories: Category[]) => _.keyBy(categories, 'id'), {
  cache: new QuickLRU({ maxSize: 1 }),
});

export class CategoryManager {
  private static getTask?: Promise<Category[]>;

  static get(): Promise<Category[]> {
    if (!CategoryManager.getTask) {
      const timer = setTimeout(() => delete CategoryManager.getTask, 5000);
      CategoryManager.getTask = (async () => {
        try {
          return await RedisCache.get();
        } catch (error) {
          clearTimeout(timer);
          delete CategoryManager.getTask;
          throw error;
        }
      })();
    }
    return CategoryManager.getTask;
  }

  static async find(id: string): Promise<Category | undefined> {
    const categories = await CategoryManager.get();
    return categories.find((c) => c.id === id);
  }

  // TODO: 还有进一步优化的空间
  static async getCategoryPath(id: string): Promise<Category[]> {
    const categories = await CategoryManager.get();
    const categoryMap = getCategoryMap(categories);
    const path: Category[] = [];
    let category = categoryMap[id];
    while (category) {
      path.push(category);
      if (!category.parentId) {
        break;
      }
      category = categoryMap[category.parentId];
    }

    return path.reverse();
  }

  static async getSubCategories(id: string | string[]): Promise<Category[]> {
    let categories = await this.get();
    const parentIds = _.castArray(id);
    const result: Category[] = [];

    while (parentIds.length) {
      const parentId = parentIds.shift()!;
      const rest: Category[] = [];

      for (const category of categories) {
        if (category.parentId === parentId) {
          result.push(category);
          parentIds.push(category.id);
        } else {
          rest.push(category);
        }
      }

      categories = rest;
    }

    return result;
  }
}
