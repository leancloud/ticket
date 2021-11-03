import { z } from 'zod';

import { Action } from '.';

const schema = z.object({
  value: z.string().nullable(),
});

const unsetGroup: Action = {
  exec: (ctx) => {
    return ctx.setGroupId(null);
  },
};

export default function (options: unknown): Action {
  const { value } = schema.parse(options);
  if (value === null) {
    return unsetGroup;
  }
  return {
    exec: (ctx) => {
      return ctx.setGroupId(value);
    },
  };
}
