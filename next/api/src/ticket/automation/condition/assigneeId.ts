import { z } from 'zod';

import { Condition, ConditionFactory, not } from '.';

const isAuthor: Condition = {
  name: 'assignee is author',
  test: (ctx) => {
    return ctx.getAssigneeId() === ctx.getAuthorId();
  },
};

const is: ConditionFactory<string | null> = (value) => {
  if (value === '__author') {
    return isAuthor;
  }
  return {
    name: `current user is ${value}`,
    test: (ctx) => {
      return ctx.getAssigneeId() === value;
    },
  };
};

const factories: Record<string, ConditionFactory<string | null>> = {
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
