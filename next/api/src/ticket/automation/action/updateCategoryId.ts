import { z } from 'zod';

import { Category } from '@/model/Category';
import { check } from './common';

export default check(
  z.object({
    value: z.string(),
  }),
  ({ value }) => ({
    exec: async ({ updater }) => {
      const category = await Category.find(value);
      if (category) {
        updater.setCategory(category);
      }
    },
  })
);
