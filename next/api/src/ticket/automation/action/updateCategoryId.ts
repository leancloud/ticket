import { z } from 'zod';

import { Action } from '.';

const schema = z.object({
  value: z.string(),
});

export function updateCategoryId(options: unknown): Action {
  const { value } = schema.parse(options);
  return {
    exec: (ctx) => {
      return ctx.setCategoryId(value);
    },
  };
}
