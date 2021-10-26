import { z } from 'zod';

import { Context } from '@/ticket/automation';
import { ConditionFactory } from '.';
import { not, string } from './common';

const getTicketTitle = (ctx: Context) => ctx.ticket.title;

const is = string.eq(getTicketTitle);
const includes = string.includes(getTicketTitle);
const includesAny = string.includesAny(getTicketTitle);
const includesAll = string.includesAll(getTicketTitle);
const startsWith = string.startsWith(getTicketTitle);
const endsWith = string.endsWith(getTicketTitle);

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

export default function title(options: unknown) {
  const { op } = schema.parse(options);
  if (op in conditionFactories) {
    return conditionFactories[op](options);
  }
  throw new Error('Unknown op: ' + op);
}
