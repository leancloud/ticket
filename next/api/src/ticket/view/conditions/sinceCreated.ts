import moment from 'moment';

export class SinceCreatedIs {
  protected value: number;

  constructor({ value }: { value: number }) {
    this.value = value;
  }

  protected getLCDate(date: Date) {
    return {
      __type: 'Date',
      iso: date.toISOString(),
    };
  }

  getCondition(): any {
    const starts = moment().subtract(this.value + 1, 'hours');
    const ends = moment().subtract(this.value, 'hours');

    return {
      createdAt: {
        $gt: this.getLCDate(starts.toDate()),
        $lte: this.getLCDate(ends.toDate()),
      },
    };
  }
}

export class SinceCreatedLt extends SinceCreatedIs {
  getCondition(): any {
    const starts = moment().subtract(this.value, 'hours');
    return {
      createdAt: {
        $gt: this.getLCDate(starts.toDate()),
      },
    };
  }
}

export class SinceCreatedGt extends SinceCreatedIs {
  getCondition(): any {
    const starts = moment().subtract(this.value, 'hours');
    return {
      createdAt: {
        $lt: this.getLCDate(starts.toDate()),
      },
    };
  }
}
