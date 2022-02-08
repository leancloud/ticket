import mem from 'mem';
import QuickLRU from 'quick-lru';

import { ACLBuilder, field, Model, ModifyOptions, serialize } from '@/orm';
import { User } from './User';
import { ArticleRevision } from './ArticleRevision';
import { ArticleFeedback, FeedbackType } from './ArticleFeedback';

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

  async createRevision(
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
      await doCreateRevision({
        content: updatedArticle.content,
        title: updatedArticle.title,
      });
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

  private async getLatestRevision() {
    const revision = await ArticleRevision.query()
      .where('FAQ', '==', this.toPointer())
      .where('meta', '!=', true)
      .orderBy('createdAt')
      .first({ useMasterKey: true });
    if (!revision) {
      throw new Error('Revision not found');
    }
    return revision;
  }
  async feedback(type: FeedbackType, author: User) {
    const revision = await this.getLatestRevision();
    try {
      return await ArticleFeedback.create(
        {
          type,
          revisionId: revision.id,
          articleId: this.id,
          authorId: author.id,
        },
        { useMasterKey: true }
      );
    } catch (error) {
      if (error instanceof Error) {
        if ((error as any).code === 137) {
          const feedback = await ArticleFeedback.query()
            .where('revision', '==', revision.toPointer())
            .where('author', '==', author.toPointer())
            .first({ useMasterKey: true });
          if (!feedback) {
            throw new Error('Deplucated value detected but no matched feedback.');
          }
          return await feedback.update(
            {
              type,
            },
            { useMasterKey: true }
          );
        }
      }
      throw error;
    }
  }
}

export const getPublicArticle = mem((id: string) => Article.find(id), {
  cache: new QuickLRU({ maxSize: 500 }),
  maxAge: 60_000,
});
