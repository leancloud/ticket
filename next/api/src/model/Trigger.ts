import { Model, field } from '@/orm';

export class Trigger extends Model {
  @field()
  title!: string;

  @field()
  description?: string;

  @field()
  conditions!: {
    any: Record<string, any>[];
    all: Record<string, any>[];
  };

  @field()
  actions!: Record<string, any>[];

  @field()
  active!: boolean;

  @field()
  position?: number;
}
