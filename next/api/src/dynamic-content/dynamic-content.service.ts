import _ from 'lodash';
import throat from 'throat';
import { Cache, LRUCacheStore, RedisStore } from '@/cache';
import { AsyncDeepRenderer, StringTemplate } from '@/common/template';
import { DynamicContent } from '@/model/DynamicContent';
import { DynamicContentVariant } from '@/model/DynamicContentVariant';
import { FullContent } from './types';

type StringKey<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T];

interface RenderObjectConfig {
  object: any;
  field: string;
  template: StringTemplate;
}

class DynamicContentService {
  private fullContentCache: Cache;

  constructor() {
    this.fullContentCache = new Cache([
      new LRUCacheStore({ max: 1000, ttl: 1000 * 60 * 10 }),
      new RedisStore({ prefix: 'cache:dc', ttl: 60 * 60 }),
    ]);
  }

  async render(content: string, locales?: string[]) {
    const template = new StringTemplate(content);
    const renderer = new AsyncDeepRenderer([template], {
      dc: (names) => this.getContentMap(names, locales),
    });
    await renderer.render();
    return template.source;
  }

  async renderObjects<T>(objects: T[], fields: StringKey<T>[], locales?: string[]) {
    if (objects.length === 0 || fields.length === 0) {
      return;
    }

    const configs: RenderObjectConfig[] = [];
    for (const object of objects) {
      for (const field of fields) {
        configs.push({
          object,
          field: field as string,
          template: new StringTemplate(object[field] as string),
        });
      }
    }

    const templates = configs.map((config) => config.template);
    const renderer = new AsyncDeepRenderer(templates, {
      dc: (names) => this.getContentMap(names, locales),
    });

    await renderer.render();

    for (const config of configs) {
      if (config.template.source) {
        config.object[config.field] = config.template.source;
      }
    }
  }

  async clearContentCache(name: string | string[]) {
    await this.fullContentCache.del(name);
  }

  async getContentMap(names: string[], locales?: string[]) {
    const fullContents = await this.getFullContents(names);

    const contentMap: Record<string, string> = {};

    fullContents.forEach((fullContent) => {
      let content: string | undefined;
      if (locales) {
        for (const locale of locales) {
          content ??= fullContent.contentByLocale[locale];
          if (content !== undefined) {
            break;
          }
        }
      }
      if (content === undefined) {
        content = fullContent.contentByLocale[fullContent.defaultLocale];
      }
      contentMap[fullContent.name] = content;
    });

    return contentMap;
  }

  private async getFullContents(names: string[]) {
    const cachedFullContents = await this.fullContentCache.mget<FullContent | null>(names);

    const missedNames = names.filter((_, i) => cachedFullContents[i] === undefined);

    if (missedNames.length) {
      const fullContents = await this.getFullContentsFromDB(missedNames);
      const fullContentByName = _.keyBy(fullContents, (c) => c.name);
      const cacheItems = missedNames.map((name) => {
        const fullContent = fullContentByName[name];
        return {
          key: name,
          value: fullContent ?? null, // 回种空值
        };
      });
      await this.fullContentCache.mset(cacheItems);
      return _.compact(cachedFullContents).concat(fullContents);
    }

    return _.compact(cachedFullContents);
  }

  private async getFullContentsFromDB(names: string[]) {
    const contents = await this.getDynamicContentsByNames(names);
    const variants = await this.getDynamicContentVariantsByContents(contents);

    const contentByName = _.keyBy(contents, (c) => c.name);
    const variantsByContentId = _.groupBy(variants, (v) => v.dynamicContentId);

    const fullContents: FullContent[] = [];

    names.forEach((name) => {
      const content = contentByName[name];
      if (!content) {
        return;
      }
      const variants = variantsByContentId[content.id];
      if (!variants) {
        return;
      }
      const contentByLocale = variants.reduce<Record<string, string>>((map, variant) => {
        map[variant.locale] = variant.content;
        return map;
      }, {});
      fullContents.push({
        name,
        defaultLocale: content.defaultLocale,
        contentByLocale,
      });
    });

    return fullContents;
  }

  private async getDynamicContentsByNames(names: string[]) {
    const chunkSize = 100;
    const concurrency = 2;

    const fetchData = async (names: string[]) => {
      const contents = await DynamicContent.queryBuilder()
        .where('name', 'in', names)
        .find({ useMasterKey: true });
      return contents;
    };

    const nameChunks = _.chunk(names, chunkSize);
    const runTask = throat(concurrency, fetchData);
    const contentChunks = await Promise.all(nameChunks.map(runTask));

    return contentChunks.flat();
  }

  private async getDynamicContentVariantsByContents(contents: DynamicContent[]) {
    const chunkSize = 50; // Pointer 序列化后比较长, 一次不能用太多
    const concurrency = 2;
    const limit = 1000;

    const fetchData = async (contents: DynamicContent[]) => {
      const contentPointers = contents.map((c) => c.toPointer());
      const variantChunks: DynamicContentVariant[][] = [];

      let finish = false;
      let cursor: string | undefined;
      while (!finish) {
        const qb = DynamicContentVariant.queryBuilder()
          .where('dynamicContent', 'in', contentPointers)
          .where('active', '==', true)
          .orderBy('objectId', 'asc')
          .limit(limit);

        if (cursor) {
          qb.where('objectId', '>', cursor);
        }

        const variants = await qb.find({ useMasterKey: true });
        variantChunks.push(variants);

        finish = variants.length < limit;
        cursor = _.last(variants)?.id;
      }
      return variantChunks.flat();
    };

    const contentChunks = _.chunk(contents, chunkSize);
    const runTask = throat(concurrency, fetchData);
    const variantChunks = await Promise.all(contentChunks.map(runTask));

    return variantChunks.flat();
  }
}

export const dynamicContentService = new DynamicContentService();
