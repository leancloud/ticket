import { z } from 'zod';

import { Category } from '@/model/Category';
import { Action } from '.';

const schema = z.object({
  value: z.string(),
});

export default function (options: unknown): Action {
  const { value } = schema.parse(options);
  return {
    exec: async ({ updater }) => {
      const category = await Category.find(value);
      if (category) {
        updater.setCategory(category);
      }
    },
  };
}
