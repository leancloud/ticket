import { field, Model, pointerId, pointTo, serialize } from '@/orm';
import { Article } from './Article';
import { ArticleRevision } from './ArticleRevision';
import { User } from './User';

export enum FeedbackType {
  Upvote =  1,
  Downvote = -1
}

export class ArticleFeedback extends Model {
  protected static className = 'FAQFeedback';

  @field()
  @serialize()
  type!: FeedbackType;

  @pointerId(() => User)
  @serialize()
  authorId!: string;

  @pointTo(() => User)
  author?: User;

  @pointerId(() => Article, 'FAQ')
  @serialize()
  articleId!: string;

  @pointerId(() => ArticleRevision)
  @serialize()
  revisionId!: string;
}
