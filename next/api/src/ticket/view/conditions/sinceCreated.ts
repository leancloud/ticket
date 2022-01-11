import moment from 'moment';
import { z } from 'zod';

import { ViewCondition } from './ViewCondition';

export class SinceCreatedIs extends ViewCondition<{ value: number }> {
  protected getLCDate(date: Date) {
    return {
      __type: 'Date',
      iso: date.toISOString(),
    };
  }

  getCondition(): any {
    const { value } = this.data;

    const now = moment();
    const starts = moment(now).subtract(value + 1, 'hours');
    const ends = moment(now).subtract(value, 'hours');

    return {
      createdAt: {
        $gt: this.getLCDate(starts.toDate()),
        $lte: this.getLCDate(ends.toDate()),
      },
    };
  }

  getZodSchema() {
    return z.object({
      value: z.number(),
    });
  }
}

export class SinceCreatedLt extends SinceCreatedIs {
  getCondition(): any {
    const { value } = this.data;
    const starts = moment().subtract(value, 'hours');

    return {
      createdAt: {
        $gt: this.getLCDate(starts.toDate()),
      },
    };
  }
}

export class SinceCreatedGt extends SinceCreatedIs {
  getCondition(): any {
    const { value } = this.data;
    const starts = moment().subtract(value, 'hours');

    return {
      createdAt: {
        $lt: this.getLCDate(starts.toDate()),
      },
    };
  }
}
