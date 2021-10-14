import { z } from 'zod';

import { Context } from '@/ticket/automation';
import { User } from '@/model/User';
import { check, not } from './common';

const V_CURRENT_USER = '(currentUser)';
const V_CUSTOMER_SERVICE = '(customerService)';
const V_TICKET_AUTHOR = '(ticketAuthor)';

export function getAssigneeId({ ticket, updatedData }: Context): string | null {
  if (updatedData?.assigneeId !== undefined) {
    return updatedData.assigneeId;
  }
  return ticket.assigneeId ?? null;
}

const is = check(
  z.object({
    value: z.string().nullable(),
  }),
  ({ value }) => ({
    test: (ctx) => {
      const assigneeId = getAssigneeId(ctx);
      if (value === V_CURRENT_USER) {
        return assigneeId === ctx.currentUserId;
      }
      if (value === V_CUSTOMER_SERVICE && assigneeId) {
        return User.isCustomerService(assigneeId);
      }
      if (value === V_TICKET_AUTHOR) {
        return assigneeId === ctx.ticket.authorId;
      }
      return assigneeId === value;
    },
  })
);

export default {
  is,
  isNot: not(is),
};
