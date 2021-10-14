import { Schema } from 'zod';

import { Condition, Context } from '@/ticket/automation';

export type Getter<T> = (ctx: Context) => T;

export type ConditionFactory<T = any> = (options: T) => Condition;

export function not(factory: ConditionFactory): ConditionFactory {
  return (options) => {
    const condition = factory(options);
    return {
      ...condition,
      test: async (ctx) => !(await condition.test(ctx)),
    };
  };
}

export function check<T>(schema: Schema<T>, factory: ConditionFactory<T>): ConditionFactory<T> {
  return (options) => factory(schema.parse(options));
}

export * as string from './string';

export * as mixed from './mixed';
