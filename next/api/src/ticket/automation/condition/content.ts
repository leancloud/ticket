import { z } from 'zod';

import { Context } from '@/ticket/automation';
import { ConditionFactory } from '.';
import { not, string } from './common';

const getContent = (ctx: Context) => ctx.ticket.content;

const is = string.eq(getContent, 'content');
const includes = string.includes(getContent, 'content');
const includesAny = string.includesAll(getContent, 'content');
const includesAll = string.includesAll(getContent, 'content');
const startsWith = string.startsWith(getContent, 'content');
const endsWith = string.endsWith(getContent, 'content');

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

export function content(options: unknown) {
  const { op } = schema.parse(options);
  if (op in conditionFactories) {
    return conditionFactories[op](options);
  }
  throw new Error('Unknown op: ' + op);
}
