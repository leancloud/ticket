import xss from '@/utils/xss';
import { Article } from '@/model/Article';

export class ArticleResponse {
  constructor(readonly article: Article) {}

  toJSON() {
    return {
      id: this.article.id,
      title: this.article.title,
      content: this.article.content,
      contentSafeHTML: xss.process(this.article.contentHTML),
      createdAt: this.article.createdAt.toISOString(),
      updatedAt: this.article.updatedAt.toISOString(),
    };
  }
}
