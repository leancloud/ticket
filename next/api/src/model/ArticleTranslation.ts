import { ACLBuilder, Model, ModifyOptions, field, pointTo, pointerId, serialize } from '@/orm';
import { Article } from './Article';
import { ArticleRevision } from './ArticleRevision';
import { User } from './User';
import { FeedbackType, ArticleFeedback } from './ArticleFeedback';
import mem from '../utils/mem-promise';
import { LocaleMatcher, matchLocale } from '@/utils/locale';

export class ArticleTranslation extends Model {
  static readonly className = 'FAQTranslation';

  @field()
  @serialize()
  title!: string;

  @field()
  content?: string;

  @field()
  contentHTML!: string;

  @field()
  language!: string;

  @field()
  private!: boolean;

  @field()
  deletedAt?: Date;

  @pointerId(() => Article)
  @serialize()
  articleId!: string;

  @pointTo(() => Article)
  article?: Article;

  @pointerId(() => ArticleRevision)
  @serialize()
  revisionId?: string;

  @pointTo(() => ArticleRevision)
  revision?: ArticleRevision;

  async delete(this: ArticleTranslation, options?: ModifyOptions) {
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
    this: ArticleTranslation,
    author: User,
    updatedArticle: ArticleTranslation,
    previousArticle?: ArticleTranslation,
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

export const getPublicTranslations = mem(
  (articleId: string) =>
    ArticleTranslation.queryBuilder()
      .where('article', '==', Article.ptr(articleId))
      // .where('article.private', '==', false)
      .where('private', '==', false)
      .preload('article')
      .preload('revision')
      .find({ useMasterKey: true }),
  { max: 500, ttl: 60_000 }
);

export const getPublicTranslationWithLocales = async (
  articleId: string,
  matcher: LocaleMatcher
) => {
  const translations = await getPublicTranslations(articleId);

  return matchLocale(
    translations,
    (translation) => translation.language,
    matcher,
    translations[0]?.article?.defaultLanguage ?? ''
  );
};
