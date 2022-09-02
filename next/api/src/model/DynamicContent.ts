import { field, hasManyThroughPointer, Model } from '@/orm';
import { DynamicContentVariant } from './DynamicContentVariant';

export class DynamicContent extends Model {
  @field()
  name!: string;

  @field()
  defaultLocale!: string;

  @field()
  defaultContent!: string;

  @hasManyThroughPointer(() => DynamicContentVariant)
  variants?: DynamicContentVariant[];
}
