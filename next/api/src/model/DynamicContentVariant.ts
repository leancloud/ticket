import { field, Model, pointerId } from '@/orm';
import { DynamicContent } from './DynamicContent';

export class DynamicContentVariant extends Model {
  @pointerId(() => DynamicContent)
  dynamicContentId!: string;

  @field()
  locale!: string;

  @field()
  content!: string;

  @field()
  active!: boolean;
}
