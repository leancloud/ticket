import { z } from 'zod';

import { Condition, ConditionFactory } from '.';
import { not } from './common';

const is: ConditionFactory<string> = (value) => {
  return {
    name: `category is ${value}`,
    test: (ctx) => {
      return ctx.getCategoryId() === value;
    },
  };
};

const factories: Record<string, ConditionFactory<string>> = {
  is,
  isNot: not(is),
};

const schema = z.object({
  op: z.string(),
  value: z.string(),
});

export default function (options: unknown): Condition {
  const { op, value } = schema.parse(options);
  const factory = factories[op];
  if (!factory) {
    throw new Error('Unknown op: ' + op);
  }
  return factory(value);
}
