import mem from '@/utils/mem-promise';
import { AuthOptions, field, Model, ModifyOptions, serialize } from '@/orm';
import { ArticleTranslation } from './ArticleTranslation';

export class Article extends Model {
  static readonly className = 'FAQ';

  @field()
  @serialize()
  name!: string;

  @field()
  private?: boolean;

  @field()
  defaultLanguage!: string;

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

  async getTranslation(this: Article, language?: string, options?: AuthOptions) {
    const translation = await ArticleTranslation.queryBuilder()
      .where('article', '==', this.toPointer())
      .where('language', '==', language || this.defaultLanguage)
      .preload('revision')
      .first(options);

    translation && (translation.article = this);

    return translation;
  }

  async getTranslations(this: Article, isPublic?: boolean) {
    const translationQb = ArticleTranslation.queryBuilder()
      .where('article', '==', this.toPointer())
      .preload('revision');

    if (isPublic) {
      translationQb.where('private', '==', false);
    }

    return (await translationQb.find({ useMasterKey: true })).map(
      (translation) => ((translation.article = this), translation)
    );
  }
}

export const getPublicArticle = mem(
  (id: string) => Article.find(id).then((article) => (article?.private ? undefined : article)),
  { max: 500, ttl: 60_000 }
);
