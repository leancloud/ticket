import { categoryService } from '@/category';
import { z } from 'zod';

import { ViewCondition } from './ViewCondition';

export class CategoryIdIs extends ViewCondition<{ value: string }> {
  getCondition(): any {
    return {
      'category.objectId': this.data.value,
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
      'category.objectId': {
        $ne: this.data.value,
      },
    };
  }
}

export class CategoryIdIsIncluded extends CategoryIdIs {
  async getCondition() {
    const categories = await categoryService.getSubCategories(this.data.value);
    return {
      'category.objectId': {
        $in: categories.map((category) => category.id),
      },
    };
  }
}
