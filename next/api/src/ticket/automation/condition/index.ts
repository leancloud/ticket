import _ from 'lodash';
import { z } from 'zod';

import { Context } from '../context';

import { ticket } from './ticket';
import { title } from './title';
import { content } from './content';
import { categoryId } from './categoryId';
import { authorId } from './authorId';
import { assigneeId } from './assigneeId';
import { groupId } from './groupId';
import { status } from './status';
import { currentUserId } from './currentUserId';

export interface Condition {
  name?: string; // 方便 debug
  test(ctx: Context): boolean | Promise<boolean>;
}

export type ConditionFactory<T = any> = (options: T) => Condition;

const alwaysMeet: Condition = { test: () => true };

const allConditionSchema = z.object({
  conditions: z.array(z.any()),
});

const all: ConditionFactory = (options) => {
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

const any: ConditionFactory = (options) => {
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

const conditionTypes: Record<string, ConditionFactory> = {
  ticket,
  title,
  content,
  categoryId,
  authorId,
  assigneeId,
  groupId,
  status,
  currentUserId,
  any,
  all,
};

const conditionSchema = z.object({
  type: z.string(),
});

export const condition: ConditionFactory = (options) => {
  const { type } = conditionSchema.parse(options);
  if (type in conditionTypes) {
    return conditionTypes[options.type](options);
  }
  throw new Error('Unknown type: ' + options.type);
};
