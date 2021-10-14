import { z } from 'zod';

import { Context } from '@/ticket/automation';
import { check, not } from './common';

function getGroupId({ ticket, updatedData }: Context): string | null {
  if (updatedData?.groupId !== undefined) {
    return updatedData.groupId;
  }
  return ticket.groupId ?? null;
}

const is = check(
  z.object({
    value: z.string().nullable(),
  }),
  ({ value }) => ({
    test: (ctx) => {
      const groupId = getGroupId(ctx);
      return groupId === value;
    },
  })
);

export default {
  is,
  isNot: not(is),
};
