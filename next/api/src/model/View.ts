import { Model, field } from '@/orm';
import { createViewCondition } from '@/ticket/view';
import { ViewConditionContext } from '@/ticket/view/conditions/ViewCondition';

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

  async getRawCondition(context: ViewConditionContext): Promise<any> {
    const condition: any = {};
    if (this.conditions.all.length) {
      condition.$and = await Promise.all(
        this.conditions.all.map((cond) => {
          return createViewCondition(cond).getCondition(context);
        })
      );
    }
    if (this.conditions.any.length) {
      condition.$or = await Promise.all(
        this.conditions.any.map((cond) => {
          return createViewCondition(cond).getCondition(context);
        })
      );
    }
    return condition;
  }
}
