import _ from 'lodash';
import mem from '@/utils/mem-promise';
import { field, hasManyThroughIdArray, Model, ModifyOptions, serialize } from '@/orm';
import { Article, getPublicArticle } from './Article';

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

const getRawTopic = mem((id: string) => ArticleTopic.find(id), { max: 500, ttl: 60_000 });

export const getTopic = async (id: string) => {
  const topic = await getRawTopic(id);
  if (topic) {
    topic.articles = _.compact(await Promise.all(topic.articleIds.map(getPublicArticle)));
  }
  return topic;
};
