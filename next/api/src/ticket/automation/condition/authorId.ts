import { z } from 'zod';

import { User } from '@/model/User';
import { Condition, ConditionFactory } from '.';
import { not } from './common';
import { getAssigneeId } from './assigneeId';

const isCurrentUser: Condition = {
  name: 'author is current user',
  test: (ctx) => {
    return ctx.ticket.authorId === ctx.currentUserId;
  },
};

const isAssignee: Condition = {
  name: 'author is assignee',
  test: (ctx) => {
    return ctx.ticket.authorId === getAssigneeId(ctx);
  },
};

const isCustomerService: Condition = {
  name: 'author is customer service',
  test: (ctx) => {
    return User.isCustomerService(ctx.ticket.authorId);
  },
};

const is: ConditionFactory<string> = (value) => {
  if (value === '__currentUser') {
    return isCurrentUser;
  }
  if (value === '__assignee') {
    return isAssignee;
  }
  if (value === '__customerService') {
    return isCustomerService;
  }
  return {
    name: `author is ${value}`,
    test: (ctx) => {
      return ctx.ticket.authorId === value;
    },
  };
};

const conditionFactories: Record<string, ConditionFactory> = {
  is,
  isNot: not(is),
};

const schema = z.object({
  op: z.string(),
  value: z.string(),
});

export function authorId(options: unknown) {
  const { op, value } = schema.parse(options);
  if (op in conditionFactories) {
    return conditionFactories[op](value);
  }
  throw new Error('Unknown op: ' + op);
}
