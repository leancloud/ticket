import { z } from 'zod';

import { Condition, ConditionFactory, not } from '.';

const is: ConditionFactory<string | null> = (value) => {
  return {
    name: `language is ${value}`,
    test: (ctx) => {
      return ctx.getLanguage() === value;
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

export default function (options: unknown): Condition {
  const { op, value } = schema.parse(options);
  const factory = factories[op];
  if (!factory) {
    throw new Error('Unknown op: ' + op);
  }
  return factory(value);
}
