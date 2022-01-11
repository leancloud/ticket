import { z } from 'zod';

import { User } from '@/model/User';
import { ViewCondition, ViewConditionContext } from './ViewCondition';

export class AssigneeIdIs extends ViewCondition<{ value: string | null }> {
  getCondition(ctx: ViewConditionContext): any {
    const { value } = this.data;

    if (value === null) {
      return {
        assignee: { $exists: false },
      };
    }

    if (value === '__currentUser') {
      return {
        assignee: ctx.currentUser.toPointer(),
      };
    }

    return {
      assignee: User.ptr(value),
    };
  }

  getZodSchema() {
    return z.object({
      value: z.string().nullable(),
    });
  }
}

export class AssigneeIdIsNot extends AssigneeIdIs {
  getCondition(ctx: ViewConditionContext): any {
    const { value } = this.data;

    if (value === null) {
      return {
        assignee: { $exists: true },
      };
    }

    if (value === '__currentUser') {
      return {
        assignee: { $ne: ctx.currentUser.toPointer() },
      };
    }

    return {
      assignee: { $ne: User.ptr(value) },
    };
  }
}
