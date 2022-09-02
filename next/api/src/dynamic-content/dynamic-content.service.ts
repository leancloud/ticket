import _ from 'lodash';
import { Cache, LRUCacheStore, RedisStore } from '@/cache';
import { DynamicContent } from '@/model/DynamicContent';
import { DynamicContentVariant } from '@/model/DynamicContentVariant';
import { LiteVariant } from './types';
import { AsyncDeepRenderer, StringTemplate } from '@/common/template';

class DynamicContentService {
  private variantCache: Cache;

  constructor() {
    const lruCacheStore = new LRUCacheStore({
      max: 1000,
      ttl: 1000 * 60, // 1 min
    });
    const redisStore = new RedisStore({
      prefix: 'cache:dc',
      ttl: 60 * 5, // 5 mins
    });
    this.variantCache = new Cache([lruCacheStore, redisStore]);
  }

  async render(content: string, locale?: string) {
    const template = new StringTemplate(content);
    const renderer = new AsyncDeepRenderer([template], {
      dc: (names) => this.getLiteVariants(names, locale),
    });
    await renderer.render();
    return template.source;
  }

  async getLiteVariants(names: string[], locale?: string) {
    const cacheKeys = names.map((name) => ({ name, locale }));
    const cachedVariants = await this.variantCache.mget<LiteVariant | null>(cacheKeys);

    const values: Record<string, string> = {};
    const missedNames: string[] = [];

    names.forEach((name, i) => {
      const variant = cachedVariants[i];
      if (variant === undefined) {
        missedNames.push(name);
      } else if (variant !== null) {
        values[variant.name] = variant.value;
      }
    });

    if (missedNames.length) {
      const variants = await this.getLiteVariantsFromDB(missedNames, locale);
      const variantByName = _.keyBy(variants, (v) => v.name);
      const items = missedNames.map((name) => {
        const variant = variantByName[name];
        return {
          key: { name, locale },
          value: variant ?? null, // 回种空值
        };
      });
      await this.variantCache.mset(items);
      variants.forEach((v) => (values[v.name] = v.value));
    }

    return values;
  }

  async getLiteVariantsFromDB(names: string[], locale?: string) {
    const dynamicContents = await DynamicContent.queryBuilder()
      .where('name', 'in', names)
      .find({ useMasterKey: true });

    if (!locale) {
      return dynamicContents.map<LiteVariant>((dc) => ({
        dcId: dc.id,
        name: dc.name,
        locale: dc.defaultLocale,
        value: dc.defaultContent,
      }));
    }

    const dcPointers = dynamicContents.map((dc) => dc.toPointer());

    const variants = await DynamicContentVariant.queryBuilder()
      .where('dynamicContent', 'in', dcPointers)
      .where('locale', '==', locale)
      .where('active', '==', true)
      .find({ useMasterKey: true });

    const variantByDcId = _.keyBy(variants, (v) => v.dynamicContentId);

    return dynamicContents.map<LiteVariant>((dc) => {
      const variant = variantByDcId[dc.id];
      if (variant) {
        return {
          dcId: dc.id,
          name: dc.name,
          locale: variant.locale,
          value: variant.content,
        };
      } else {
        return {
          dcId: dc.id,
          name: dc.name,
          locale: dc.defaultLocale,
          value: dc.defaultContent,
        };
      }
    });
  }
}

export const dynamicContentService = new DynamicContentService();
