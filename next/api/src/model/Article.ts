import mem from 'mem';
import QuickLRU from 'quick-lru';

import { field, Model, ModifyOptions, serialize } from '@/orm';

export class Article extends Model {
  protected static className = 'FAQ';

  @field('question')
  @serialize()
  title!: string;

  @field('answer')
  content!: string;

  @field('answer_HTML')
  contentHTML!: string;

  @field('archived')
  private?: boolean;

  @field()
  deletedAt?: Date;

  async delete(this: Article, options?: ModifyOptions) {
    await this.update(
      {
        // Empty ACL means no one can access
        ACL: {},
        deletedAt: new Date(),
      },
      { ...options, ignoreAfterHook: true, ignoreBeforeHook: true }
    );
  }
}

export const getPublicArticle = mem((id: string) => Article.find(id), {
  cache: new QuickLRU({ maxSize: 500 }),
  maxAge: 60_000,
});
