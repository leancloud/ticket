import _ from 'lodash';
import mem from 'mem';
import { Cache, LRUCacheStore, RedisStore } from '@/cache';
import { dynamicContentService } from '@/dynamic-content/dynamic-content.service';
import { Category } from '@/model/Category';
import { FindCategoriesOptions } from './types';
import { ACLBuilder, AuthOptions, CreateData, UpdateData } from '@/orm';
import { HttpError } from '@/common/http';
import { openAIService } from '@/service/openai';

export class CategoryService {
  private categoryCache: Cache;

  constructor() {
    const redisStore = new RedisStore({
      prefix: 'cache:category',
      ttl: 60 * 5,
    });
    const memStore = new LRUCacheStore({
      ttl: 1000 * 20,
      max: 1000,
    });
    this.categoryCache = new Cache([memStore, redisStore]);
  }

  async find({ active }: FindCategoriesOptions = {}) {
    let categories: Category[];

    const cacheValue = await this.categoryCache.get({ active });

    if (cacheValue) {
      categories = (cacheValue as any[]).map((v) => Category.fromJSON(v));
    } else {
      const query = Category.queryBuilder();

      if (active === true) {
        query.where('deletedAt', 'not-exists');
      }
      if (active === false) {
        query.where('deletedAt', 'exists');
      }

      categories = await query.limit(1000).find();

      await this.categoryCache.set({ active }, categories);
    }

    return categories;
  }

  async findOne(id: string) {
    let category: Category | undefined;

    const cacheValue = await this.categoryCache.get({ id });

    if (cacheValue) {
      category = Category.fromJSON(cacheValue);
    } else {
      category = await Category.find(id);
      if (category) {
        await this.categoryCache.set({ id }, category);
      }
    }

    return category;
  }

  async renderCategories(categories: Category[], locales?: string[]) {
    if (categories.length === 0) {
      return;
    }

    categories.forEach((category) => {
      category.rawName = category.name;
    });

    await dynamicContentService.renderObjects(categories, ['name'], locales);
  }

  async getSubCategories(id: string | string[], active?: boolean) {
    const parentIds = _.castArray(id);
    const categories = await this.find();
    const categoriesByParentId = _.groupBy(categories, 'parentId');
    const categoriesByAlias = _.groupBy(categories, 'alias');
    const subCategories: Category[] = [];

    while (parentIds.length) {
      const parentId = parentIds.shift()!;
      const addToList = (category: Category) => {
        parentIds.push(category.id);
        subCategories.push(category);
      };
      categoriesByParentId[parentId]?.forEach(addToList);
      categoriesByAlias[parentId]?.forEach(addToList);
    }

    if (active !== undefined) {
      return active
        ? subCategories.filter((c) => c.deletedAt === undefined)
        : subCategories.filter((c) => c.deletedAt !== undefined);
    }
    return subCategories;
  }

  async getParentCategories(id: string) {
    const categories = await this.find();
    const categoriesById = _.keyBy(categories, (c) => c.id);
    const parents: Category[] = [];
    let target = categoriesById[id];
    while (target) {
      parents.push(target);
      if (target.parentId) {
        target = categoriesById[target.parentId];
      } else {
        break;
      }
    }
    return parents.slice(1);
  }

  async create(data: CreateData<Category>, options?: AuthOptions) {
    const ACL = new ACLBuilder().allow('*', 'read').allowCustomerService('write');
    const category = await Category.create({ ...data, ACL }, options);
    await this.categoryCache.del([{ active: undefined }, { active: true }]);
    return category;
  }

  async batchUpdate(datas: (UpdateData<Category> & { id: string })[], options?: AuthOptions) {
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
      if (data.deletedAt && hasActiveChildren(category)) {
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

    await this.categoryCache.del([
      { active: undefined },
      { active: true },
      { active: false },
      ...datas.map((data) => ({ id: data.id })),
    ]);
  }

  async classifyTicketWithAI(id: string, content: string) {
    const categories = await this.getSubCategories(id, true);

    return openAIService.classify(content, categories);
  }
}

export const categoryService = new CategoryService();
