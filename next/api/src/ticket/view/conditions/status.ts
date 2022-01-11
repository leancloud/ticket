import { z } from 'zod';

import { ViewCondition } from './ViewCondition';

export class StatusIs extends ViewCondition<{ value: number }> {
  getCondition(): any {
    return {
      status: this.data.value,
    };
  }

  getZodSchema() {
    return z.object({
      value: z.number(),
    });
  }
}

export class StatusIsNot extends StatusIs {
  getCondition(): any {
    return {
      status: {
        $ne: this.data.value,
      },
    };
  }
}
