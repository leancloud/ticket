import { z } from 'zod';

import { Condition, ConditionFactory, not, string } from '../../condition';
import { TriggerContext } from '../context';

const getReplyContent = (ctx: TriggerContext) => ctx.reply?.content;

const is = string.eq(getReplyContent, 'replyContent');
const includes = string.includes(getReplyContent, 'replyContent');
const includesAny = string.includesAny(getReplyContent, 'replyContent');
const includesAll = string.includesAll(getReplyContent, 'replyContent');
const startsWith = string.startsWith(getReplyContent, 'replyContent');
const endsWith = string.endsWith(getReplyContent, 'replyContent');

const factories: Record<string, ConditionFactory<any, TriggerContext>> = {
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

export default function (options: unknown): Condition<TriggerContext> {
  const { op } = schema.parse(options);
  const factory = factories[op];
  if (!factory) {
    throw new Error('Unknown op: ' + op);
  }
  return factory(options);
}
