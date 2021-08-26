import moment from 'moment';

import { Select } from 'components/Select';

const options = [
  { key: '', text: '所有时间' },
  { key: 'today', text: '今天' },
  { key: 'yesterday', text: '昨天' },
  { key: 'week', text: '本周' },
  { key: '7d', text: '过去 7 天' },
  { key: 'month', text: '本月' },
  { key: '30d', text: '过去 30 天' },
];

const timeRangeGetters: Record<string, () => [Date, Date]> = {
  today: () => [moment().startOf('day').toDate(), moment().endOf('day').toDate()],
  yesterday: () => [
    moment().subtract(1, 'day').startOf('day').toDate(),
    moment().subtract(1, 'day').endOf('day').toDate(),
  ],
  week: () => [
    moment().weekday(1).startOf('day').toDate(),
    moment().weekday(7).endOf('day').toDate(),
  ],
  month: () => [moment().startOf('month').toDate(), moment().endOf('month').toDate()],
};

const timeRangeUnitGetters: Record<string, (count: number) => [Date, Date]> = {
  d: (count) => [
    moment().startOf('day').subtract(count, 'day').toDate(),
    moment().endOf('day').subtract(1, 'day').toDate(),
  ],
};

const timeRangeRegExp = new RegExp(`(\\d+)([${Object.keys(timeRangeUnitGetters).join('|')}])`);

export function getTimeRange(value: string): [Date, Date] | undefined {
  if (value in timeRangeGetters) {
    return timeRangeGetters[value]();
  }

  const matchResult = value.match(timeRangeRegExp);
  if (matchResult) {
    const [, count, unit] = matchResult;
    return timeRangeUnitGetters[unit](parseInt(count));
  }
}

export interface CreatedAtSelectProps {
  value?: string;
  onChange: (value?: string) => void;
}

export function CreatedAtSelect({ value, onChange }: CreatedAtSelectProps) {
  return (
    <Select
      closeOnChange
      options={options}
      selected={value ?? ''}
      onSelect={(key) => onChange(key || undefined)}
    />
  );
}
