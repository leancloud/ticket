import { z } from 'zod';

import { ConditionFactory } from '.';
import { not } from './common';

const is: ConditionFactory<number> = (value) => {
  return {
    name: `status is ${value}`,
    test: (ctx) => ctx.getStatus() === value,
  };
};

const factories: Record<string, ConditionFactory> = {
  is,
  isNot: not(is),
};

const schema = z.object({
  op: z.string(),
  value: z.number(),
});

export function status(options: unknown) {
  const { op, value } = schema.parse(options);
  const factory = factories[op];
  if (!factory) {
    throw new Error('Unknown op: ' + op);
  }
  return factory(value);
}
