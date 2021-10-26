import { z } from 'zod';

import { User } from '@/model/User';
import { Action } from '.';

const schema = z.object({
  value: z.string().nullable(),
});

export default function (options: unknown): Action {
  const { value } = schema.parse(options);
  return {
    exec: async ({ updater }) => {
      if (value === null) {
        updater.setAssignee(null);
        return;
      }
      const assignee = await User.find(value, { useMasterKey: true });
      if (assignee) {
        updater.setAssignee(assignee);
      }
    },
  };
}
