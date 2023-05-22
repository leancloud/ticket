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
    [key: string]: any;
    type: string;
  };

  @field()
  fields!: string[];

  @field()
  sortBy?: string;

  @field()
  sortOrder?: 'asc' | 'desc';

  @field()
  position?: number;

  static assertConditionsValid(
    conditions: any,
    stack = 'conditions',
    cb?: (path: string, cond: any) => any
  ) {
    if (conditions.type === 'all') {
      conditions.conditions.map((cond: any, i: number) =>
        this.assertConditionsValid(cond, `${stack}.all.${i}`, cb)
      );
    } else if (conditions.type === 'any') {
      conditions.conditions.map((cond: any, i: number) =>
        this.assertConditionsValid(cond, `${stack}.any.${i}`, cb)
      );
    } else {
      cb?.(stack, conditions);
    }
  }

  static async encodeCondition(conditions: any, context: ViewConditionContext): Promise<any> {
    if (conditions.type === 'all') {
      return {
        $and: await Promise.all(
          conditions.conditions.map((cond: any) => this.encodeCondition(cond, context))
        ),
      };
    } else if (conditions.type === 'any') {
      return {
        $or: await Promise.all(
          conditions.conditions.map((cond: any) => this.encodeCondition(cond, context))
        ),
      };
    } else {
      return createViewCondition(conditions).getCondition(context);
    }
  }

  async getRawCondition(context: ViewConditionContext): Promise<any> {
    return View.encodeCondition(this.conditions, context);
  }
}
