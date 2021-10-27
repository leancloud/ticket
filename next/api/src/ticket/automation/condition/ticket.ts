import { z } from 'zod';

import { Condition } from '@/ticket/automation';

const conditions: Record<string, Condition> = {
  created: {
    name: 'ticket is created',
    test: (ctx) => ctx.type === 'ticketCreated',
  },
  updated: {
    name: 'ticket is updated',
    test: (ctx) => ctx.type === 'ticketUpdated',
  },
  replied: {
    name: 'ticket is replied',
    test: (ctx) => ctx.type === 'ticketReplied',
  },
};

const schema = z.object({
  op: z.string(),
});

export function ticket(options: unknown): Condition {
  const { op } = schema.parse(options);
  if (op in conditions) {
    return conditions[op];
  }
  throw new Error('Unknown op: ' + op);
}
