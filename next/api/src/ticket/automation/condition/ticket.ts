import { z } from 'zod';

import { Condition } from '@/ticket/automation';

const conditions: Record<string, Condition> = {
  created: {
    test: (ctx) => ctx.type === 'ticketCreated',
  },
  updated: {
    test: (ctx) => ctx.type === 'ticketUpdated',
  },
  replied: {
    test: (ctx) => ctx.type === 'ticketReplied',
  },
};

const schema = z.object({
  op: z.string(),
});

export default function ticket(options: unknown): Condition {
  const { op } = schema.parse(options);
  if (op in conditions) {
    return conditions[op];
  }
  throw new Error('Unknown op: ' + op);
}
