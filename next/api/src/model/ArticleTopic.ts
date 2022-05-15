import { field, hasManyThroughIdArray, Model, ModifyOptions, pointerIds, serialize } from '@/orm';
import { Article, getPublicArticle } from './Article';
import mem from 'p-memoize';
import QuickLRU from 'quick-lru';
import { isTruthy } from '@/utils';

export class ArticleTopic extends Model {
  protected static className = 'FAQTopic';

  @field()
  @serialize()
  name!: string;

  @field('FAQIds')
  @serialize()
  articleIds!: string[];

  @hasManyThroughIdArray(() => Article)
  articles!: Article[];

  @field()
  deletedAt?: Date;

  @field()
  @serialize()
  meta?: Record<string, any>;

  async delete(this: ArticleTopic, options?: ModifyOptions) {
    await this.update(
      {
        deletedAt: new Date(),
      },
      { ...options, ignoreAfterHook: true, ignoreBeforeHook: true }
    );
  }
}

const getRawTopic = mem((id: string) => ArticleTopic.find(id), {
  cache: new QuickLRU({ maxSize: 500 }),
  maxAge: 60_000,
});

export const getTopic = async (id: string) => {
  const topic = await getRawTopic(id);
  if (topic) {
    topic.articles = await (await Promise.all(topic.articleIds.map(getPublicArticle))).filter(
      isTruthy
    );
  }
  return topic;
};
