import { z } from 'zod';

import { ConditionFactory } from '.';
import { not } from './common';

const is: ConditionFactory<string | null> = (value) => {
  return {
    name: `group is ${value}`,
    test: (ctx) => {
      return ctx.getGroupId() === value;
    },
  };
};

const factories: Record<string, ConditionFactory> = {
  is,
  isNot: not(is),
};

const schema = z.object({
  op: z.string(),
  value: z.string().nullable(),
});

export function groupId(options: unknown) {
  const { op, value } = schema.parse(options);
  const factory = factories[op];
  if (!factory) {
    throw new Error('Unknown op: ' + op);
  }
  return factory(value);
}
