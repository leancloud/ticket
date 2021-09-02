import AV from 'leancloud-storage';
import _ from 'lodash';

import { redis } from '../../cache';

export class Category {
  id: string;
  name: string;
  description?: string;
  qTemplate?: string;
  order?: number;
  parentId?: string;
  formId?: string;
  groupId?: string;
  faqIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  constructor(data: {
    id: string;
    name: string;
    description?: string;
    qTemplate?: string;
    order?: number;
    parentId?: string;
    formId?: string;
    groupId?: string;
    faqIds?: string[];
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description ?? undefined;
    this.qTemplate = data.qTemplate ?? undefined;
    this.order = data.order ?? undefined;
    this.parentId = data.parentId ?? undefined;
    this.formId = data.formId ?? undefined;
    this.groupId = data.groupId ?? undefined;
    this.faqIds = data.faqIds ?? undefined;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt ?? undefined;
  }

  static fromJSON(data: any) {
    return new Category({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      deletedAt: data.deletedAt ? new Date(data.deletedAt) : undefined,
    });
  }

  static fromAVObject(object: AV.Object) {
    return new Category({
      id: object.id!,
      name: object.get('name'),
      description: object.get('description'),
      qTemplate: object.get('qTemplate'),
      order: object.get('order'),
      parentId: object.get('parent')?.id,
      formId: object.get('form')?.id,
      groupId: object.get('group')?.id,
      faqIds: object.get('FAQs')?.map((o: AV.Object) => o.id),
      createdAt: object.createdAt!,
      updatedAt: object.updatedAt!,
      deletedAt: object.get('deletedAt'),
    });
  }

  static async get(): Promise<Category[]> {
    const query = new AV.Query<AV.Object>('Category');
    const objects = await query.find();
    return objects.map(Category.fromAVObject);
  }

  static async find(id: string): Promise<Category | undefined> {
    const query = new AV.Query<AV.Object>('Category').equalTo('objectId', id);
    const object = await query.first();
    if (object) {
      return Category.fromAVObject(object);
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      qTemplate: this.qTemplate,
      order: this.order,
      parentId: this.parentId,
      formId: this.formId,
      groupId: this.groupId,
      faqIds: this.faqIds,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}

export class CategoryCache {
  static CACHE_KEY = 'categories';
  static CACHE_TTL = 60 * 5; // 5 min

  static async get(): Promise<Category[] | undefined> {
    const data = await redis.hvals(CategoryCache.CACHE_KEY);
    if (data.length) {
      return data.map((item) => Category.fromJSON(JSON.parse(item)));
    }
  }

  static async set(categories: Category[]) {
    const p = redis.pipeline();
    p.del(CategoryCache.CACHE_KEY);
    categories.forEach((c) => p.hset(CategoryCache.CACHE_KEY, c.id, JSON.stringify(c)));
    p.expire(CategoryCache.CACHE_KEY, CategoryCache.CACHE_TTL);
    await p.exec();
  }

  static async find(id: string): Promise<Category | undefined> {
    const data = await redis.hget(CategoryCache.CACHE_KEY, id);
    if (data) {
      return Category.fromJSON(JSON.parse(data));
    }
  }
}

export class CategoryManager {
  static async get(): Promise<Category[]> {
    const cached = await CategoryCache.get();
    if (cached) {
      return cached;
    }

    const categories = await Category.get();
    CategoryCache.set(categories).catch((error) => {
      // TODO(sdjdd): Sentry
      console.error(`[Cache] Set ${CategoryCache.CACHE_KEY}:`, error);
    });
    return categories;
  }

  static async find(id: string): Promise<Category | undefined> {
    const cached = await CategoryCache.find(id);
    if (cached) {
      return cached;
    }

    // XXX: 当 categories 缓存不存在时总是会查数据库, 但这种情况不会经常出现
    return Category.find(id);
  }

  static async getSubCategories(id: string | string[]): Promise<Category[]> {
    let categories = await CategoryManager.get();
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
