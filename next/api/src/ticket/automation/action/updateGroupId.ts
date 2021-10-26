import { z } from 'zod';

import { Group } from '@/model/Group';
import { Action } from '.';

const schema = z.object({
  value: z.string().nullable(),
});

export default function (options: unknown): Action {
  const { value } = schema.parse(options);
  return {
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
  };
}
