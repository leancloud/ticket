import { z } from 'zod';

import { Group } from '@/model/Group';
import { ViewCondition } from './ViewCondition';

export class GroupIdIs extends ViewCondition<{ value: string | null }> {
  getCondition(): any {
    const { value } = this.data;
    return {
      group:
        value === null
          ? {
              $exists: false,
            }
          : Group.ptr(value),
    };
  }

  getZodSchema() {
    return z.object({
      value: z.string().nullable(),
    });
  }
}

export class GroupIdIsNot extends GroupIdIs {
  getCondition(): any {
    const { value } = this.data;
    return {
      group:
        value === null
          ? {
              $exists: true,
            }
          : {
              $ne: Group.ptr(value),
            },
    };
  }
}
