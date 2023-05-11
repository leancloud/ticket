import { Cache, RedisStore } from '@/cache';
import { Article } from '@/model/Article';
import { ArticleTranslation } from '@/model/ArticleTranslation';

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

  async getArticlePublishedLanguages(articleId: string) {
    const cacheKey = `${articleId}:langs`;
    const cacheValue = await this.cache.get(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const translations = await ArticleTranslation.queryBuilder()
      .where('article', '==', Article.ptr(articleId))
      .where('deletedAt', 'not-exists')
      .where('private', '==', false)
      .find({ useMasterKey: true });

    const languages = translations.map((t) => t.language);
    // 空数组就是一种空值，不需要再回种 null
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
    const cacheKey = `${articleId}:langs`;
    const languages = await this.cache.get<string[]>(cacheKey);
    if (languages) {
      const cacheKeys = [cacheKey].concat(languages.map((lang) => `${articleId}:lang:${lang}`));
      await this.cache.del(cacheKeys);
    }
  }
}

export const articleService = new ArticleService();
