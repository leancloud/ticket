import { z } from 'zod';

import { ConditionFactory } from '.';
import { not } from './common';
import { getAssigneeId } from './assigneeId';

const is: ConditionFactory<string> = (value) => {
  return {
    test: (ctx) => {
      const authorId = ctx.ticket.authorId;
      if (value === '__currentUser') {
        return authorId === ctx.currentUserId;
      }
      if (value === '__assignee') {
        return authorId === getAssigneeId(ctx);
      }
      return authorId === value;
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

export default function (options: unknown) {
  const { op, value } = schema.parse(options);
  if (op in conditionFactories) {
    return conditionFactories[op](value);
  }
  throw new Error('Unknown op: ' + op);
}
