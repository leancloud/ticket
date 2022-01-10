import { z } from 'zod';

import { User } from '@/model/User';
import { ViewCondition } from './ViewCondition';

export class AssigneeIdIs extends ViewCondition<{ value: string | null }> {
  getCondition(): any {
    const { value } = this.data;
    return {
      assignee:
        value === null
          ? {
              $exists: false,
            }
          : User.ptr(value),
    };
  }

  getZodSchema() {
    return z.object({
      value: z.string().nullable(),
    });
  }
}

export class AssigneeIdIsNot extends AssigneeIdIs {
  getCondition(): any {
    const { value } = this.data;
    return {
      assignee:
        value === null
          ? {
              $exists: true,
            }
          : {
              $ne: User.ptr(value),
            },
    };
  }
}
