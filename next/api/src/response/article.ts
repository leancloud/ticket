import { sanitize } from '@/utils/xss';
import sluggo from 'sluggo';
import { Article } from '@/model/Article';
import { config } from '@/config';
import { ArticleTranslation } from '@/model/ArticleTranslation';

export class ArticleTranslationAbstractResponse {
  constructor(readonly articleTranslation: ArticleTranslation) {}

  toJSON() {
    const articleId = this.articleTranslation.articleId;
    const slug = `${articleId}-${sluggo(this.articleTranslation.title)}`;
    return {
      id: articleId,
      title: this.articleTranslation.title,
      language: this.articleTranslation.language,
      slug,
      url: `${config.host}/in-app/v1/products/-/articles/${slug}?nav=0`,
      revision: this.articleTranslation.revision
        ? {
            upvote: this.articleTranslation.revision.upvote,
            downvote: this.articleTranslation.revision.downvote,
          }
        : undefined,
      createdAt: this.articleTranslation.createdAt.toISOString(),
      updatedAt: this.articleTranslation.updatedAt.toISOString(),
    };
  }
}

export class ArticleTranslationResponse extends ArticleTranslationAbstractResponse {
  toJSON() {
    return {
      ...super.toJSON(),
      content: this.articleTranslation.content,
      contentSafeHTML: sanitize(this.articleTranslation.contentHTML),
    };
  }
}

export class ArticleResponse {
  constructor(readonly article: Article) {}

  toJSON() {
    return {
      id: this.article.id,
      name: this.article.name,
      publishedFrom: this.article.publishedFrom,
      publishedTo: this.article.publishedTo,
      defaultLanguage: this.article.defaultLanguage,
      createdAt: this.article.createdAt.toISOString(),
      updatedAt: this.article.updatedAt.toISOString(),
    };
  }
}
