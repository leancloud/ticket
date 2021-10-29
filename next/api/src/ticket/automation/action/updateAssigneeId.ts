import { z } from 'zod';

import { Action } from '.';

const updateToCurrentUser: Action = {
  exec: (ctx) => {
    return ctx.setAssigneeId(ctx.currentUserId);
  },
};

const unsetAssignee: Action = {
  exec: (ctx) => {
    return ctx.setAssigneeId(null);
  },
};

const schema = z.object({
  value: z.string().nullable(),
});

export function updateAssigneeId(options: unknown): Action {
  const { value } = schema.parse(options);
  if (value === null) {
    return unsetAssignee;
  }
  if (value === '__currentUser') {
    return updateToCurrentUser;
  }
  return {
    exec: (ctx) => {
      return ctx.setAssigneeId(value);
    },
  };
}
