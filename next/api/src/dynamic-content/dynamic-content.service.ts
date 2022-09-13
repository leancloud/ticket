import _ from 'lodash';
import { Cache, LRUCacheStore, RedisStore } from '@/cache';
import { AsyncDeepRenderer, StringTemplate } from '@/common/template';
import { DynamicContent } from '@/model/DynamicContent';
import { DynamicContentVariant } from '@/model/DynamicContentVariant';
import { FullContent } from './types';

class DynamicContentService {
  private fullContentCache: Cache;

  constructor() {
    this.fullContentCache = new Cache([
      new LRUCacheStore({ max: 1000, ttl: 1000 * 60 }),
      new RedisStore({ prefix: 'cache:dc', ttl: 60 * 5 }),
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
    const contents = await DynamicContent.queryBuilder()
      .where('name', 'in', names)
      .find({ useMasterKey: true });

    const contentPointers = contents.map((c) => c.toPointer());
    const variants = await DynamicContentVariant.queryBuilder()
      .where('dynamicContent', 'in', contentPointers)
      .where('active', '==', true)
      .find({ useMasterKey: true });

    const contentByName = _.keyBy(contents, (c) => c.name);
    const variantsByContentId = _.groupBy(variants, (v) => v.dynamicContentId);

    const fullContents: FullContent[] = [];

    names.forEach((name) => {
      const content = contentByName[name];
      if (content) {
        const variants = variantsByContentId[content.id];
        const contentByLocale = variants.reduce<Record<string, string>>((map, variant) => {
          map[variant.locale] = variant.content;
          return map;
        }, {});
        fullContents.push({
          name,
          defaultLocale: content.defaultLocale,
          contentByLocale,
        });
      }
    });

    return fullContents;
  }
}

export const dynamicContentService = new DynamicContentService();
