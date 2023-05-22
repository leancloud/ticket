import { field, Model, ModifyOptions, serialize } from '@/orm';

export class Article extends Model {
  static readonly className = 'FAQ';

  @field()
  @serialize()
  name!: string;

  @field()
  @serialize()
  defaultLanguage!: string;

  @field()
  @serialize.Date()
  publishedFrom?: Date;

  @field()
  @serialize.Date()
  publishedTo?: Date;

  @field()
  @serialize.Date()
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

  isPublished() {
    const now = Date.now();
    if (this.publishedFrom && this.publishedFrom.getTime() > now) {
      return false;
    }
    if (this.publishedTo && this.publishedTo.getTime() < now) {
      return false;
    }
    return true;
  }
}
