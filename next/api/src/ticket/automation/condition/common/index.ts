import { ConditionFactory } from '..';

export * as string from './string';
export * as number from './number';

export function not<T>(factory: ConditionFactory<T>): ConditionFactory<T> {
  return (options) => {
    const condition = factory(options);
    return {
      name: `not(${condition.name})`,
      test: async (ctx) => !(await condition.test(ctx)),
    };
  };
}
