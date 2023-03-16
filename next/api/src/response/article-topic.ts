import { ArticleTopic } from '@/model/ArticleTopic';
import { ArticleTranslationAbstractResponse } from './article';

export class ArticleTopicResponse {
  constructor(readonly topic: ArticleTopic) {}

  toJSON() {
    return {
      id: this.topic.id,
      meta: this.topic.meta,
      name: this.topic.name,
      articleIds: this.topic.articleIds,
      createdAt: this.topic.createdAt.toISOString(),
      updatedAt: this.topic.updatedAt.toISOString(),
    };
  }
}

export class ArticleTopicFullResponse extends ArticleTopicResponse {
  constructor(readonly topic: ArticleTopic) {
    super(topic);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      articles: this.topic.translations?.map(
        (translation) => new ArticleTranslationAbstractResponse(translation)
      ),
    };
  }
}
