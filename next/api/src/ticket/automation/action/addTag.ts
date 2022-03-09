import { z } from 'zod';

import { Action } from '.';

const schema = z.object({
  private: z.boolean().optional(),
  key: z.string(),
  value: z.string(),
});

export default function (options: unknown): Action {
  const { private: isPrivate, key, value } = schema.parse(options);
  return {
    exec: (ctx) => {
      if (isPrivate) {
        ctx.addPrivateTag({ key, value });
      } else {
        ctx.addTag({ key, value });
      }
    },
  };
}
