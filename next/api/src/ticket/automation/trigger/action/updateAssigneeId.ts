import { z } from 'zod';

import { Action } from '../../action';
import { TriggerContext } from '../context';

const updateToCurrentUser: Action<TriggerContext> = {
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

export default function (options: unknown): Action<TriggerContext> {
  const { value } = schema.parse(options);
  if (value === '__currentUser') {
    return updateToCurrentUser;
  }
  if (value === null) {
    return unsetAssignee;
  }
  return {
    exec: (ctx) => {
      return ctx.setAssigneeId(value);
    },
  };
}
