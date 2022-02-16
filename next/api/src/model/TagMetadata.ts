import { Model, field } from '@/orm';

export class TagMetadata extends Model {
  @field()
  key!: string;

  @field()
  type!: 'select' | 'text';

  @field()
  values?: string[];

  @field()
  isPrivate!: boolean;
}
