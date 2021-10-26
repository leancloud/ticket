import { Model, field } from '@/orm';

export class Trigger extends Model {
  @field()
  title!: string;

  @field()
  description?: string;

  @field()
  conditions!: {
    [key: string]: any;
    type: string;
  };

  @field()
  actions!: Record<string, any>[];

  @field()
  active!: boolean;

  @field()
  position?: number;

  getPosition(): number {
    return this.position ?? this.createdAt.getTime();
  }
}
