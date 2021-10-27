import { ConditionFactory } from '..';

export function not<T>(factory: ConditionFactory<T>): ConditionFactory<T> {
  return (options) => {
    const condition = factory(options);
    return {
      name: `not(${condition.name})`,
      test: async (ctx) => !(await condition.test(ctx)),
    };
  };
}

export * as string from './string';
