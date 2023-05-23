import throat from 'throat';
import _ from 'lodash';
import { ACLBuilder, Model, ModifyOptions, field, pointTo, pointerId, serialize } from '@/orm';
import { Article } from './Article';
import { ArticleRevision } from './ArticleRevision';
import { User } from './User';
import { FeedbackType, ArticleFeedback } from './ArticleFeedback';
import { LocaleMatcher } from '@/utils/locale';
import { articleService } from '@/article/article.service';

export class ArticleTranslation extends Model {
  static readonly className = 'FAQTranslation';

  @field()
  @serialize()
  title!: string;

  @field()
  @serialize()
  content?: string;

  @field()
  @serialize()
  contentHTML!: string;

  @field()
  @serialize()
  language!: string;

  @field()
  @serialize()
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
      await this.update(
        {
          revisionId: revision.id,
        },
        {
          useMasterKey: true,
        }
      );
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

/**
 * @deprecated
 */
export async function getArticleTranslation(articleId: string, matcher: LocaleMatcher) {
  const article = await articleService.getArticle(articleId);
  if (!article || !article.isPublished()) {
    return;
  }

  const languages = await articleService.getArticleLanguages(articleId);
  if (languages.length === 0) {
    return;
  }

  const language = matcher(languages, article.defaultLanguage);
  const translation = await articleService.getArticleTranslation(article.id, language);
  if (!translation) {
    return;
  }

  return translation;
}

/**
 * @deprecated
 */
export async function getPublishedArticleTranslations(
  articleIds: string[],
  matcher: LocaleMatcher,
  concurrency = 3
) {
  if (articleIds.length === 0) {
    return [];
  }
  const createTask = throat(concurrency, (id: string) => {
    return getArticleTranslation(id, matcher);
  });
  const translations = await Promise.all(articleIds.map(createTask));
  return _.compact(translations);
}
