import { Model, field } from '@/orm';
import { createViewCondition } from '@/ticket/view';

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

  getRawCondition(): any {
    const condition: any = {};
    if (this.conditions.all.length) {
      condition.$and = this.conditions.all.map((cond) => {
        return createViewCondition(cond).getCondition();
      });
    }
    if (this.conditions.any.length) {
      condition.$or = this.conditions.any.map((cond) => {
        return createViewCondition(cond).getCondition();
      });
    }
    return condition;
  }
}
