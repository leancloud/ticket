import { z } from 'zod';

import { Context } from '@/ticket/automation';
import { ConditionFactory } from '.';
import { not } from './common';

function getCategoryId({ ticket, updatedData }: Context): string {
  return updatedData?.categoryId ?? ticket.categoryId;
}

const is: ConditionFactory<string> = (value) => {
  return {
    name: `category is ${value}`,
    test: (ctx) => {
      return getCategoryId(ctx) === value;
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

export function categoryId(options: unknown) {
  const { op, value } = schema.parse(options);
  if (op in conditionFactories) {
    return conditionFactories[op](value);
  }
  throw new Error('Unknown op: ' + op);
}
