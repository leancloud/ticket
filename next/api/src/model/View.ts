import { Model, field } from '@/orm';

export class View extends Model {
  @field()
  title!: string;

  @field()
  userIds?: string[];

  @field()
  groupIds?: string[];

  @field()
  conditions!: {
    all: any[];
    any: any[];
  };

  @field()
  fields!: string[];

  @field()
  sortBy?: string;

  @field()
  sortOrder?: 'asc' | 'desc';

  @field()
  position?: number;
}
