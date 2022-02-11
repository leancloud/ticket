import mem from 'mem';
import QuickLRU from 'quick-lru';
import { Error as LCError } from 'leancloud-storage';

import { ACLBuilder, field, Model, ModifyOptions, pointerId, pointTo, serialize } from '@/orm';
import { User } from './User';
import { ArticleRevision } from './ArticleRevision';
import { ArticleFeedback, FeedbackType } from './ArticleFeedback';

export class Article extends Model {
  public static className = 'FAQ';

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

  @pointerId(() => ArticleRevision)
  @serialize()
  revisionId?: string;

  @pointTo(() => ArticleRevision)
  revision?: ArticleRevision;

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

  async createRevision(
    this: Article,
    author: User,
    updatedArticle: Article,
    previousArticle?: Article,
    comment?: string
  ) {
    const doCreateRevision = async (data: Partial<ArticleRevision>) => {
      return ArticleRevision.create(
        {
          ...data,
          authorId: author.id,
          articleId: this.id,
          comment,
          ACL: new ACLBuilder().allowStaff('read'),
        },
        {
          useMasterKey: true,
        }
      );
    };

    const contentChanged =
      updatedArticle.content !== previousArticle?.content ||
      updatedArticle.title !== previousArticle?.title;
    if (contentChanged) {
      const revision = await doCreateRevision({
        content: updatedArticle.content,
        title: updatedArticle.title,
      });
      this.update(
        {
          revisionId: revision.id,
        },
        {
          useMasterKey: true,
        }
      );
    }

    const metaChanged =
      updatedArticle.private !== previousArticle?.private ||
      (previousArticle === undefined && updatedArticle.private);
    if (metaChanged) {
      await doCreateRevision({
        meta: true,
        private: updatedArticle.private,
      });
    }
  }

  async feedback(type: FeedbackType, author: User) {
    console.log(this);
    const { revisionId } = this;
    if (!revisionId) {
      throw new Error('Revision not found');
    }
    await ArticleFeedback.upsert(
      {
        type,
        revisionId,
        articleId: this.id,
        authorId: author.id,
      },
      (queryBuilder) =>
        queryBuilder
          .where('revision', '==', ArticleRevision.ptr(revisionId))
          .where('author', '==', author.toPointer()),
      {
        type,
      },
      { useMasterKey: true }
    );
  }
}

export const getPublicArticle = mem((id: string) => Article.find(id), {
  cache: new QuickLRU({ maxSize: 500 }),
  maxAge: 60_000,
});
