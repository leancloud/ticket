import { ArticleRevision } from '@/model/ArticleRevision';
import htmlify from '@/utils/htmlify';
import { sanitize } from '@/utils/xss';
import { UserResponse } from './user';

export class ArticleRevisionListItemResponse {
  constructor(readonly revision: ArticleRevision) {}

  toJSON() {
    return {
      id: this.revision.id,
      meta: this.revision.meta,
      private: this.revision.private,
      title: this.revision.title,
      author: this.revision.author ? new UserResponse(this.revision.author) : undefined,
      comment: this.revision.comment,
      upvote: this.revision.upvote,
      downvote: this.revision.downvote,
      createdAt: this.revision.createdAt.toISOString(),
      updatedAt: this.revision.updatedAt.toISOString(),
    };
  }
}

export class ArticleRevisionResponse extends ArticleRevisionListItemResponse {
  toJSON() {
    return {
      ...super.toJSON(),
      content: this.revision.content,
      contentSafeHTML: this.revision.content ? sanitize(htmlify(this.revision.content)) : undefined,
    };
  }
}
