import _ from 'lodash';

import { Cache, RedisStore } from '@/cache';
import { Article } from '@/model/Article';
import { ArticleTranslation } from '@/model/ArticleTranslation';
import { ArticleLanguages } from './types';

export class ArticleService {
  private cache: Cache;

  constructor() {
    const redisStore = new RedisStore({
      prefix: 'article',
      ttl: 60 * 60, // 1 hour
    });
    this.cache = new Cache([redisStore]);
  }

  async getArticle(articleId: string) {
    const cacheValue = await this.cache.get(articleId);
    if (cacheValue) {
      return Article.fromJSON(cacheValue);
    }
    if (cacheValue === null) {
      return;
    }

    const article = await Article.queryBuilder()
      .where('objectId', '==', articleId)
      .where('deletedAt', 'not-exists')
      .first({ useMasterKey: true });

    if (article) {
      await this.cache.set(articleId, article.toJSON());
    } else {
      await this.cache.set(articleId, null);
    }

    return article;
  }

  async getArticleLanguages(articleId: string) {
    const cacheKey = `${articleId}:langs`;
    const cacheValue = await this.cache.get<ArticleLanguages>(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const translations = await ArticleTranslation.queryBuilder()
      .where('article', '==', Article.ptr(articleId))
      .where('deletedAt', 'not-exists')
      .find({ useMasterKey: true });

    const [unpublished, published] = _.partition(translations, (t) => t.private);

    const languages: ArticleLanguages = {
      published: published.map((t) => t.language),
      unpublished: unpublished.map((t) => t.language),
    };

    await this.cache.set(cacheKey, languages);

    return languages;
  }

  async getArticleTranslation(articleId: string, language: string) {
    const cacheKey = `${articleId}:lang:${language}`;
    const cacheValue = await this.cache.get(cacheKey);
    if (cacheValue) {
      return ArticleTranslation.fromJSON(cacheValue);
    }
    if (cacheValue === null) {
      return;
    }

    const translation = await ArticleTranslation.queryBuilder()
      .where('article', '==', Article.ptr(articleId))
      .where('language', '==', language)
      .where('deletedAt', 'not-exists')
      .first({ useMasterKey: true });

    if (translation) {
      await this.cache.set(cacheKey, translation.toJSON());
    } else {
      await this.cache.set(cacheKey, null);
    }

    return translation;
  }

  async clearArticleCache(articleId: string) {
    await this.clearArticleTranslationsCache(articleId);
    await this.cache.del(articleId);
  }

  async clearArticleTranslationsCache(articleId: string) {
    const { published, unpublished } = await this.getArticleLanguages(articleId);
    const langs = published.concat(unpublished);
    if (langs.length) {
      await this.cache.del([
        `${articleId}:langs`,
        ...langs.map((lang) => `${articleId}:lang:${lang}`),
      ]);
    } else {
      await this.cache.del(`${articleId}:langs`);
    }
  }

  async clearArticleTranslationCache(articleId: string, language: string) {
    await this.cache.del([`${articleId}:langs`, `${articleId}:lang:${language}`]);
  }
}

export const articleService = new ArticleService();
