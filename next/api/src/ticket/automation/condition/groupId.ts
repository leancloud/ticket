import { z } from 'zod';

import { Context } from '@/ticket/automation';
import { ConditionFactory } from '.';
import { not } from './common';

function getGroupId({ ticket, updatedData }: Context): string | null {
  if (updatedData?.groupId !== undefined) {
    return updatedData.groupId;
  }
  return ticket.groupId ?? null;
}

const is: ConditionFactory<string | null> = (value) => {
  return {
    test: (ctx) => {
      const groupId = getGroupId(ctx);
      return groupId === value;
    },
  };
};

const conditionFactories: Record<string, ConditionFactory> = {
  is,
  isNot: not(is),
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
