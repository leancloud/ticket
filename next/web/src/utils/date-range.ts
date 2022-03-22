import moment from 'moment';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export const relativeDateGetters: Record<string, () => DateRange> = {
  today: () => ({
    from: moment().startOf('day').toDate(),
    to: moment().endOf('day').toDate(),
  }),
  yesterday: () => ({
    from: moment().subtract(1, 'day').startOf('day').toDate(),
    to: moment().subtract(1, 'day').endOf('day').toDate(),
  }),
  lastWeek: () => ({
    from: moment().startOf('week').subtract(1, 'week').toDate(),
    to: moment().endOf('week').subtract(1, 'week').toDate(),
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

export function decodeDateRange(value: string): DateRange | undefined {
  const getter = relativeDateGetters[value];
  if (getter) {
    return getter();
  }
  if (value.includes('..')) {
    const [from, to] = value.split('..');
    return {
      from: from === undefined ? undefined : new Date(from),
      to: to === undefined ? undefined : new Date(to),
    };
  }
}
