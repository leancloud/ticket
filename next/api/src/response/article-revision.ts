import { ArticleRevision } from '@/model/ArticleRevision';
import { User } from '@/model/User';
import htmlify from '@/utils/htmlify';
import xss from '@/utils/xss';
import { UserResponse } from './user';

export class ArticleRevisionListItemResponse {
  constructor(readonly revision: ArticleRevision, readonly includeRating = false) {}

  toJSON() {
    return {
      id: this.revision.id,
      meta: this.revision.meta,
      private: this.revision.private,
      title: this.revision.title,
      author: this.revision.author ? new UserResponse(this.revision.author) : undefined,
      comment: this.revision.comment,
      upvote: this.includeRating ? this.revision.upvote : undefined,
      downvote: this.includeRating ? this.revision.downvote : undefined,
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
      contentSafeHTML: this.revision.content
        ? xss.process(htmlify(this.revision.content))
        : undefined,
    };
  }
}
