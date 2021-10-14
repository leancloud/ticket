import { z } from 'zod';

import { User } from '@/model/User';
import { check } from './common';

export default check(
  z.object({
    value: z.string().nullable(),
  }),
  ({ value }) => ({
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
  })
);
