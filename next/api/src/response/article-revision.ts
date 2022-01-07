import { ArticleRevision } from '@/model/ArticleRevision';
import xss from '@/utils/xss';
import { UserResponse } from './user';

export class ArticleRevisionListItemResponse {
  constructor(readonly revision: ArticleRevision) {}

  toJSON() {
    return {
      id: this.revision.id,
      title: this.revision.title,
      author: this.revision.author ? new UserResponse(this.revision.author) : undefined,
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
      contentSafeHTML: this.revision.content ? xss.process(this.revision.content) : undefined,
    };
  }
}
