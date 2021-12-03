import moment from 'moment';

export interface DateRange {
  from?: Date;
  to?: Date;
}

const relativeDateGetters: Record<string, () => DateRange> = {
  today: () => ({
    from: moment().startOf('day').toDate(),
    to: moment().endOf('day').toDate(),
  }),
  yesterday: () => ({
    from: moment().subtract(1, 'day').startOf('day').toDate(),
    to: moment().subtract(1, 'day').endOf('day').toDate(),
  }),
  week: () => ({
    from: moment().weekday(1).startOf('day').toDate(),
    to: moment().weekday(7).endOf('day').toDate(),
  }),
  month: () => ({
    from: moment().startOf('month').toDate(),
    to: moment().endOf('month').toDate(),
  }),
  lastMonth: () => ({
    from: moment().startOf('month').subtract(1, 'month').toDate(),
    to: moment().endOf('month').subtract(1, 'month').toDate(),
  }),
};

const relativeDateCreators: Record<string, (count: number) => DateRange> = {
  d: (cnt) => ({
    from: moment().startOf('day').subtract(cnt, 'day').toDate(),
    to: moment().endOf('day').subtract(cnt, 'day').toDate(),
  }),
};

const relativeDateUnits = Object.keys(relativeDateCreators);

const dateRangeRegExp = new RegExp(`(\\d+)([${relativeDateUnits.join('')}])`);

export function decodeDateRange(value: string): DateRange | undefined {
  const getter = relativeDateGetters[value];
  if (getter) {
    return getter();
  }

  const match = value.match(dateRangeRegExp);
  if (match) {
    const [, count, unit] = match;
    const creator = relativeDateCreators[unit];
    return creator?.(parseInt(count));
  }
}
