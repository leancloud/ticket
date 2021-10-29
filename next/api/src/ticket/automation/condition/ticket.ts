import { z } from 'zod';

import { Condition } from '@/ticket/automation';

const conditions: Record<string, Condition> = {
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

export function ticket(options: unknown): Condition {
  const { op } = schema.parse(options);
  const condition = conditions[op];
  if (!condition) {
    throw new Error('Unknown op: ' + op);
  }
  return condition;
}
