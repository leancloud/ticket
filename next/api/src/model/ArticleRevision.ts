import { field, Model, pointerId, pointTo, serialize } from '@/orm';
import { TinyUserInfo, User } from './User';
import { ArticleTranslation } from './ArticleTranslation';

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

  @field('archived')
  @serialize()
  private?: boolean;

  @field()
  @serialize()
  meta?: boolean;

  @field()
  @serialize()
  comment?: string;

  @field()
  @serialize()
  upvote?: number;

  @field()
  @serialize()
  downvote?: number;

  @pointerId(() => User)
  @serialize()
  authorId!: string;

  @pointTo(() => User)
  author?: User;

  @pointerId(() => ArticleTranslation, 'FAQTranslation')
  @serialize()
  articleId!: string;
}
