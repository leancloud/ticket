import { field, Model, pointerId, pointTo, serialize } from '@/orm';
import { Article } from './Article';
import { TinyUserInfo, User } from './User';

export interface TinyArticleRevision {
  objectId: string;
  title: string;
  content?: string;
  author: TinyUserInfo;
  createdAt: Date;
  updatedAt: Date;
}

export class ArticleRevision extends Model {
  protected static className = 'FAQRevision';

  @field('question')
  @serialize()
  title!: string;

  @field('answer')
  @serialize()
  content?: string;

  @pointerId(() => User)
  @serialize()
  authorId!: string;

  @pointTo(() => User)
  author?: User;

  @pointerId(() => Article, 'FAQ')
  @serialize()
  articleId!: string;
}
