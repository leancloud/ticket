import { field, Model, ModifyOptions, serialize } from '@/orm';

export class Article extends Model {
  static readonly className = 'FAQ';

  @field()
  @serialize()
  name!: string;

  @field()
  @serialize()
  private?: boolean;

  @field()
  @serialize()
  defaultLanguage!: string;

  @field()
  @serialize()
  publishedFrom?: Date;

  @field()
  @serialize()
  publishedTo?: Date;

  @field()
  @serialize()
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
