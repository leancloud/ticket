import { z } from 'zod';

import { Condition, ConditionFactory } from '.';
import { not } from './common';

const isCurrentUser: Condition = {
  name: 'assignee is current user',
  test: (ctx) => {
    return ctx.getAssigneeId() === ctx.currentUserId;
  },
};

const isAuthor: Condition = {
  name: 'assignee is author',
  test: (ctx) => {
    return ctx.getAssigneeId() === ctx.getAuthorId();
  },
};

const is: ConditionFactory<string | null> = (value) => {
  if (value === '__currentUser') {
    return isCurrentUser;
  }
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

const factories: Record<string, ConditionFactory> = {
  is,
  isNot: not(is),
};

const schema = z.object({
  op: z.string(),
  value: z.string().nullable(),
});

export function assigneeId(options: unknown) {
  const { op, value } = schema.parse(options);
  const factory = factories[op];
  if (!factory) {
    throw new Error('Unknown op: ' + op);
  }
  return factory(value);
}
