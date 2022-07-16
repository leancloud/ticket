import { actions } from '@/model/OpsLog';
import { z } from 'zod';

import { Action } from '.';

const schema = z.object({
  value: z.enum(actions),
});

export default function (options: unknown): Action {
  const { value } = schema.parse(options);
  return {
    exec: (ctx) => {
      return ctx.changeStatus(value);
    },
  };
}
