import mem from 'mem';
import QuickLRU from 'quick-lru';
import { field, Model, serialize } from '../orm';

export class Article extends Model {
  protected static className = 'FAQ';

  @field('question')
  @serialize()
  title!: string;

  @field('answer')
  content!: string;

  @field('answer_HTML')
  contentHTML!: string;

  @field()
  archived!: boolean;
}

export const getArticle = mem((id: string) => Article.find(id), {
  cache: new QuickLRU({ maxSize: 500 }),
  maxAge: 3 * 60_000,
});
