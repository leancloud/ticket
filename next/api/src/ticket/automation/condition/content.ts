import { z } from 'zod';

import { Context } from '@/ticket/automation';
import { ConditionFactory } from '.';
import { not, string } from './common';

const getTicketContent = (ctx: Context) => ctx.ticket.content;

const is = string.eq(getTicketContent);
const includes = string.includes(getTicketContent);
const includesAny = string.includesAll(getTicketContent);
const includesAll = string.includesAll(getTicketContent);
const startsWith = string.startsWith(getTicketContent);
const endsWith = string.endsWith(getTicketContent);

const conditionFactories: Record<string, ConditionFactory> = {
  is,
  isNot: not(is),
  includes,
  notIncludes: not(includes),
  includesAny,
  notIncludesAny: not(includesAny),
  includesAll,
  notIncludesAll: not(includesAll),
  startsWith,
  endsWith,
};

const schema = z.object({
  op: z.string(),
});

export default function (options: unknown) {
  const { op } = schema.parse(options);
  if (op in conditionFactories) {
    return conditionFactories[op](options);
  }
  throw new Error('Unknown op: ' + op);
}
