import { z } from 'zod';

import { Category } from '@/model/Category';
import { ViewCondition } from './ViewCondition';

export class CategoryIdIs extends ViewCondition<{ value: string }> {
  getCondition(): any {
    return {
      category: Category.ptr(this.data.value),
    };
  }

  getZodSchema() {
    return z.object({
      value: z.string(),
    });
  }
}

export class CategoryIdIsNot extends CategoryIdIs {
  getCondition() {
    return {
      category: {
        $ne: Category.ptr(this.data.value),
      },
    };
  }
}
