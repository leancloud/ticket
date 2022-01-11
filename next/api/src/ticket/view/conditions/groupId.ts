import { z } from 'zod';

import { Group } from '@/model/Group';
import { ViewCondition, ViewConditionContext } from './ViewCondition';

export class GroupIdIs extends ViewCondition<{ value: string | null }> {
  async getCondition(ctx: ViewConditionContext): Promise<any> {
    const { value } = this.data;

    if (value === null) {
      return {
        group: { $exists: false },
      };
    }

    if (value === '__groupsOfCurrentUser') {
      const groups = await ctx.getGroupsOfCurrentUser();
      return {
        group: { $in: groups.map((g) => g.toPointer()) },
      };
    }

    return {
      group: Group.ptr(value),
    };
  }

  getZodSchema() {
    return z.object({
      value: z.string().nullable(),
    });
  }
}

export class GroupIdIsNot extends GroupIdIs {
  async getCondition(ctx: ViewConditionContext): Promise<any> {
    const { value } = this.data;

    if (value === null) {
      return {
        group: { $exists: true },
      };
    }

    if (value === '__groupsOfCurrentUser') {
      const groups = await ctx.getGroupsOfCurrentUser();
      return {
        group: { $nin: groups.map((g) => g.toPointer()) },
      };
    }

    return {
      group: { $ne: Group.ptr(value) },
    };
  }
}
