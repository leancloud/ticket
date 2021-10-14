import _ from 'lodash';
import { z } from 'zod';

import { Context } from '..';

import title from './title';
import content from './content';
import categoryId from './categoryId';
import authorId from './authorId';
import assigneeId from './assigneeId';
import groupId from './groupId';
import status from './status';

export interface Condition {
  test(ctx: Context): boolean | Promise<boolean>;
}

export type ConditionFactory<T = any> = (options: T) => Condition;

const conditionTypes: Record<string, Record<string, ConditionFactory>> = {
  title,
  content,
  categoryId,
  authorId,
  assigneeId,
  groupId,
  status,
};

const conditionSchema = z.object({
  type: z.string(),
  op: z.string(),
});

export function condition(options: any): Condition {
  const { type, op } = conditionSchema.parse(options);

  const factoryByOp = conditionTypes[type as keyof typeof conditionTypes];
  if (!factoryByOp) {
    throw new Error('unknown type: ' + type);
  }

  const factory = factoryByOp[op];
  if (!factory) {
    throw new Error('unknown op: ' + op);
  }

  return factory(options);
}

const alwaysMeet: Condition = { test: () => true };

export function any(conditions: Condition[]): Condition {
  if (conditions.length === 0) {
    return alwaysMeet;
  }
  return {
    test: async (ctx) => {
      for (const condition of conditions) {
        if (await condition.test(ctx)) {
          return true;
        }
      }
      return false;
    },
  };
}

export function all(conditions: Condition[]): Condition {
  if (conditions.length === 0) {
    return alwaysMeet;
  }
  return {
    test: async (ctx) => {
      for (const condition of conditions) {
        if (!(await condition.test(ctx))) {
          return false;
        }
      }
      return true;
    },
  };
}
