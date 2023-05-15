import _ from 'lodash';
import mem from '@/utils/mem-promise';
import { field, hasManyThroughIdArray, Model, ModifyOptions, serialize } from '@/orm';
import { Article } from './Article';
import { ArticleTranslation, getPublishedArticleTranslations } from './ArticleTranslation';
import { LocaleMatcher } from '@/utils/locale';

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

  translations?: ArticleTranslation[];

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

export const getTopic = async (id: string, matcher: LocaleMatcher) => {
  const topic = await getRawTopic(id);
  if (topic) {
    topic.translations = await getPublishedArticleTranslations(topic.articleIds, matcher);
  }
  return topic;
};
