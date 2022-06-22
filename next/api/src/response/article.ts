import { sanitize } from '@/utils/xss';
import sluggo from 'sluggo';
import { Article } from '@/model/Article';
import { config } from '@/config';

export class ArticleAbstractResponse {
  constructor(readonly article: Article) {}

  toJSON() {
    const slug = `${this.article.id}-${sluggo(this.article.title)}`;
    return {
      id: this.article.id,
      title: this.article.title,
      slug,
      url: `${config.host}/in-app/v1/products/-/articles/${slug}?nav=0`,
      private: !!this.article.private,
      revision: this.article.revision
        ? {
            upvote: this.article.revision?.upvote,
            downvote: this.article.revision?.downvote,
          }
        : undefined,
      createdAt: this.article.createdAt.toISOString(),
      updatedAt: this.article.updatedAt.toISOString(),
    };
  }
}

export class ArticleResponse extends ArticleAbstractResponse {
  constructor(readonly article: Article) {
    super(article);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      content: this.article.content,
      contentSafeHTML: sanitize(this.article.contentHTML),
    };
  }
}
