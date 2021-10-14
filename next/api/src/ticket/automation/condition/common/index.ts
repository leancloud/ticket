import { Schema } from 'zod';

import { ConditionFactory } from '..';

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
