import { Model, field } from '@/orm';

export class TimeTrigger extends Model {
  @field()
  title!: string;

  @field()
  description?: string;

  @field()
  conditions!: {
    type: string;
    [key: string]: any;
  };

  @field()
  actions!: {
    type: string;
    [key: string]: any;
  }[];

  @field()
  active!: boolean;

  @field()
  position?: number;

  getPosition(): number {
    return this.position ?? this.createdAt.getTime();
  }
}
