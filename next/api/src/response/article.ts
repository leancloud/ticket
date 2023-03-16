import { sanitize } from '@/utils/xss';
import sluggo from 'sluggo';
import { Article } from '@/model/Article';
import { config } from '@/config';
import { ArticleTranslation } from '@/model/ArticleTranslation';

export class ArticleTranslationAbstractResponse {
  private article: Article;

  constructor(readonly articleTranslation: ArticleTranslation) {
    this.article = articleTranslation.article!;
  }

  toJSON() {
    const slug = `${this.article.id}-${sluggo(this.articleTranslation.title)}`;
    return {
      id: this.article.id,
      title: this.articleTranslation.title,
      language: this.articleTranslation.language,
      slug,
      url: `${config.host}/in-app/v1/products/-/articles/${slug}?nav=0`,
      private: !!this.articleTranslation.private,
      revision: this.articleTranslation.revision
        ? {
            upvote: this.articleTranslation.revision?.upvote,
            downvote: this.articleTranslation.revision?.downvote,
          }
        : undefined,
      createdAt: this.articleTranslation.createdAt.toISOString(),
      updatedAt: this.articleTranslation.updatedAt.toISOString(),
    };
  }
}

export class ArticleTranslationResponse extends ArticleTranslationAbstractResponse {
  constructor(readonly articleTranslation: ArticleTranslation) {
    super(articleTranslation);
  }

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
      private: !!this.article.private,
      defaultLanguage: this.article.defaultLanguage,
      createdAt: this.article.createdAt.toISOString(),
      updatedAt: this.article.updatedAt.toISOString(),
    };
  }
}
