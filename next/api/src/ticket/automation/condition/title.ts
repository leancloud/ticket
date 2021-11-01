import { z } from 'zod';

import { Context } from '../context';
import { Condition, ConditionFactory, not, string } from '.';

const getTitle = (ctx: Context) => ctx.getTitle();

const is = string.eq(getTitle, 'title');
const includes = string.includes(getTitle, 'title');
const includesAny = string.includesAny(getTitle, 'title');
const includesAll = string.includesAll(getTitle, 'title');
const startsWith = string.startsWith(getTitle, 'title');
const endsWith = string.endsWith(getTitle, 'title');

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
