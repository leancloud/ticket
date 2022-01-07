import mem from 'mem';
import QuickLRU from 'quick-lru';

import { ACLBuilder, field, Model, ModifyOptions, serialize } from '@/orm';
import { User } from '@sentry/node';
import { ArticleRevision } from './ArticleRevision';

export class Article extends Model {
  protected static className = 'FAQ';

  @field('question')
  @serialize()
  title!: string;

  @field('answer')
  content?: string;

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

  async createRevision(author: User, newTitle: string, newContent?: string) {
    return ArticleRevision.create(
      {
        content: newContent,
        title: newTitle,
        authorId: author.id,
        articleId: this.id,
        ACL: new ACLBuilder().allowStaff('read'),
      },
      {
        useMasterKey: true,
      }
    );
  }
}

export const getPublicArticle = mem((id: string) => Article.find(id), {
  cache: new QuickLRU({ maxSize: 500 }),
  maxAge: 60_000,
});
