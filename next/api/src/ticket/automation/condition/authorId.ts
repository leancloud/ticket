import { z } from 'zod';

import { check, not } from './common';
import { getAssigneeId } from './assigneeId';

const V_TICKET_ASSIGNEE = '(ticketAssignee)';

const is = check(
  z.object({
    value: z.string(),
  }),
  ({ value }) => ({
    test: (ctx) => {
      const authorId = ctx.ticket.authorId;
      if (value === V_TICKET_ASSIGNEE) {
        return authorId === getAssigneeId(ctx);
      }
      return authorId === value;
    },
  })
);

export default {
  is,
  isNot: not(is),
};
