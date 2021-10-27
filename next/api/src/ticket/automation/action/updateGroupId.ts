import { z } from 'zod';

import { Group } from '@/model/Group';
import { Action } from '.';

const schema = z.object({
  value: z.string().nullable(),
});

const unsetGroup: Action = {
  exec: (ctx) => {
    ctx.updater.setGroup(null);
  },
};

export function updateGroupId(options: unknown): Action {
  const { value } = schema.parse(options);
  if (value === null) {
    return unsetGroup;
  }
  return {
    exec: async ({ updater }) => {
      const group = await Group.find(value, { useMasterKey: true });
      if (group) {
        updater.setGroup(group);
      }
    },
  };
}
