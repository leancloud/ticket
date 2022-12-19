import { z } from 'zod';

import { Context } from '../context';
import { Condition, ConditionFactory, not, string } from '.';

const getContent = (ctx: Context) => ctx.getContent();

const is = string.eq(getContent, 'content');
const includes = string.includes(getContent, 'content');
const includesAny = string.includesAny(getContent, 'content');
const includesAll = string.includesAll(getContent, 'content');
const startsWith = string.startsWith(getContent, 'content');
const endsWith = string.endsWith(getContent, 'content');

const factories: Record<string, ConditionFactory> = {
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

export default function (options: unknown): Condition {
  const { op } = schema.parse(options);
  const factory = factories[op];
  if (!factory) {
    throw new Error('Unknown op: ' + op);
  }
  return factory(options);
}
