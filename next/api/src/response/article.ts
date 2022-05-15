import { sanitize } from '@/utils/xss';
import { Article } from '@/model/Article';

export class ArticleAbstractResponse {
  constructor(readonly article: Article) {}

  toJSON() {
    return {
      id: this.article.id,
      title: this.article.title,
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
