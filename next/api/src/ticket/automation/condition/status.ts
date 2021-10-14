import { z } from 'zod';

import { Context } from '@/ticket/automation';
import { check, mixed, not } from './common';

function getStatus({ ticket, updatedData }: Context): number {
  return updatedData?.status ?? ticket.status;
}

const is = check(
  z.object({
    value: z.number(),
  }),
  mixed.eq(getStatus)
);

export default {
  is,
  isNot: not(is),
};
