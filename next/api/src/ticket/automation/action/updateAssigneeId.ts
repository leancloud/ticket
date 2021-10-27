import { z } from 'zod';

import { User } from '@/model/User';
import { Action } from '.';

const schema = z.object({
  value: z.string().nullable(),
});

const updateToCurrentUser: Action = {
  exec: async (ctx) => {
    const assignee = await User.find(ctx.currentUserId, { useMasterKey: true });
    if (assignee) {
      ctx.updater.setAssignee(assignee);
    }
  },
};

const unsetAssignee: Action = {
  exec: (ctx) => {
    ctx.updater.setAssignee(null);
  },
};

export function updateAssigneeId(options: unknown): Action {
  const { value } = schema.parse(options);
  if (value === null) {
    return unsetAssignee;
  }
  if (value === '__currentUser') {
    return updateToCurrentUser;
  }
  return {
    exec: async ({ updater }) => {
      const assignee = await User.find(value, { useMasterKey: true });
      if (assignee) {
        updater.setAssignee(assignee);
      }
    },
  };
}
