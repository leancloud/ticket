import { ConditionFactory, Getter } from '.';

export function eq(getter: Getter<any>): ConditionFactory {
  return (options) => {
    const { value } = options;
    if (value === undefined) {
      throw new Error('value cannot be undefined');
    }
    return {
      options,
      test: (ctx) => getter(ctx) === value,
    };
  };
}
