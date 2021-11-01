import { z } from 'zod';

import { Condition } from '../../condition';
import { TriggerContext } from '../context';

const conditions: Record<string, Condition<TriggerContext>> = {
  created: {
    name: 'ticket is created',
    test: (ctx) => ctx.event === 'created',
  },
  updated: {
    name: 'ticket is updated',
    test: (ctx) => ctx.event === 'updated',
  },
  replied: {
    name: 'ticket is replied',
    test: (ctx) => ctx.event === 'replied',
  },
};

const schema = z.object({
  op: z.string(),
});

export default function (options: unknown): Condition<TriggerContext> {
  const { op } = schema.parse(options);
  const condition = conditions[op];
  if (!condition) {
    throw new Error('Unknown op: ' + op);
  }
  return condition;
}
