import { z } from 'zod';

import { Action } from '.';

const unsetAssignee: Action = {
  exec: (ctx) => {
    return ctx.setAssigneeId(null);
  },
};

const schema = z.object({
  value: z.string().nullable(),
});

export default function (options: unknown): Action {
  const { value } = schema.parse(options);
  if (value === null) {
    return unsetAssignee;
  }
  return {
    exec: (ctx) => {
      return ctx.setAssigneeId(value);
    },
  };
}
