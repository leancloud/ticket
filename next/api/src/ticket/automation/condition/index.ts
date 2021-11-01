import _ from 'lodash';
import { z } from 'zod';

import { Context } from '../context';

export * from './common';

export interface Condition<Ctx extends Context = Context> {
  name?: string; // 方便 debug
  test(ctx: Ctx): boolean | Promise<boolean>;
}

export type ConditionFactory<T = any, Ctx extends Context = Context> = (
  options: T
) => Condition<Ctx>;

const alwaysMeet: Condition = { test: () => true };

const allConditionSchema = z.object({
  conditions: z.array(z.any()),
});

export function all(factory: ConditionFactory<any, any>): ConditionFactory<any, any> {
  const condition = _.identity(factory);
  return (options) => {
    const { conditions } = allConditionSchema.parse(options);
    if (conditions.length === 0) {
      return alwaysMeet;
    }
    const conditionObjects = conditions.map(condition);
    return {
      name: `all(${conditionObjects.map((c) => c.name).join(', ')})`,
      test: async (ctx) => {
        for (const condition of conditionObjects) {
          if (!(await condition.test(ctx))) {
            return false;
          }
        }
        return true;
      },
    };
  };
}

export function any(factory: ConditionFactory<any, any>): ConditionFactory<any, any> {
  const condition = _.identity(factory);
  return (options) => {
    const { conditions } = allConditionSchema.parse(options);
    if (conditions.length === 0) {
      return alwaysMeet;
    }
    const conditionObjects = conditions.map(condition);
    return {
      name: `any(${conditionObjects.map((c) => c.name).join(', ')})`,
      test: async (ctx) => {
        for (const condition of conditionObjects) {
          if (await condition.test(ctx)) {
            return true;
          }
        }
        return false;
      },
    };
  };
}
