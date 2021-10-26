import { z } from 'zod';

import { Context } from '@/ticket/automation';
import { User } from '@/model/User';
import { ConditionFactory } from '.';
import { not } from './common';

export function getAssigneeId({ ticket, updatedData }: Context): string | null {
  if (updatedData?.assigneeId !== undefined) {
    return updatedData.assigneeId;
  }
  return ticket.assigneeId ?? null;
}

const is: ConditionFactory<string | null> = (value) => {
  return {
    test: (ctx) => {
      const assigneeId = getAssigneeId(ctx);
      if (value === '__currentUser') {
        return assigneeId === ctx.currentUserId;
      }
      if (value === '__customerService' && assigneeId) {
        return User.isCustomerService(assigneeId);
      }
      if (value === '__author') {
        return assigneeId === ctx.ticket.authorId;
      }
      return assigneeId === value;
    },
  };
};

const isNot = not(is);

const conditionFactories: Record<string, ConditionFactory<string | null>> = {
  is,
  isNot,
};

const schema = z.object({
  op: z.string(),
  value: z.string().nullable(),
});

export default function (options: unknown) {
  const { op, value } = schema.parse(options);
  if (op in conditionFactories) {
    return conditionFactories[op](value);
  }
  throw new Error('Unknown op: ' + op);
}
