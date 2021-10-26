import { z } from 'zod';

import { Context } from '@/ticket/automation';
import { ConditionFactory } from '.';
import { not } from './common';

function getStatus({ ticket, updatedData }: Context): number {
  return updatedData?.status ?? ticket.status;
}

const is: ConditionFactory<number> = (value) => {
  return {
    test: (ctx) => getStatus(ctx) === value,
  };
};

const conditionFactories: Record<string, ConditionFactory> = {
  is,
  isNot: not(is),
};

const schema = z.object({
  op: z.string(),
  value: z.number(),
});

export default function (options: unknown) {
  const { op, value } = schema.parse(options);
  if (op in conditionFactories) {
    return conditionFactories[op](value);
  }
  throw new Error('Unknown op: ' + op);
}
