import { z } from 'zod';

import { Context } from '@/ticket/automation';
import { Condition, ConditionFactory } from '.';
import { not } from './common';

export function getAssigneeId({ ticket, updatedData }: Context): string | null {
  if (updatedData?.assigneeId !== undefined) {
    return updatedData.assigneeId;
  }
  return ticket.assigneeId ?? null;
}

const isCurrentUser: Condition = {
  name: 'assignee is current user',
  test: (ctx) => {
    return getAssigneeId(ctx) === ctx.currentUserId;
  },
};

const isAuthor: Condition = {
  name: 'assignee is author',
  test: (ctx) => {
    return getAssigneeId(ctx) === ctx.ticket.authorId;
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
      return getAssigneeId(ctx) === value;
    },
  };
};

const conditionFactories: Record<string, ConditionFactory<string | null>> = {
  is,
  isNot: not(is),
};

const schema = z.object({
  op: z.string(),
  value: z.string().nullable(),
});

export function assigneeId(options: unknown) {
  const { op, value } = schema.parse(options);
  if (op in conditionFactories) {
    return conditionFactories[op](value);
  }
  throw new Error('Unknown op: ' + op);
}
