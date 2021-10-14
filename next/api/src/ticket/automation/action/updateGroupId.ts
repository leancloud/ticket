import { z } from 'zod';

import { Group } from '@/model/Group';
import { check } from './common';

export default check(
  z.object({
    value: z.string().nullable(),
  }),
  ({ value }) => ({
    exec: async ({ updater }) => {
      if (value === null) {
        updater.setGroup(null);
        return;
      }
      const group = await Group.find(value, { useMasterKey: true });
      if (group) {
        updater.setGroup(group);
      }
    },
  })
);
