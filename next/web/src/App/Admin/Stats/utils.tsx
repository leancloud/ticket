import moment from 'moment';
import { relativeDateGetters } from '@/utils/date-range';
import { useMemo } from 'react';
import { DatePicker } from '@/components/antd';

export const getRollUp = (from?: Date | string, to?: Date | string) => {
  if (!from || !to) {
    return 'hour';
  }
  const milliseconds = moment(to).toDate().getTime() - moment(from).toDate().getTime();
  if (milliseconds > 2 * 24 * 60 * 60 * 1000) {
    return 'day';
  }
  return 'hour';
};

export const STATS_FIELD = [
  'created',
  'closed',
  'reopened',
  'conversion',
  // 'internalConversion',
  // 'externalConversion',
  'firstReplyTimeAVG',
  'replyTimeAVG',
  'naturalReplyTimeAVG',
  'replyCount',
  'internalReplyCount',
] as const;
export type StatsField = typeof STATS_FIELD[number];
export const STATS_FIELD_LOCALE = {
  created: '新建工单',
  closed: '关单数',
  reopened: '激活工单数',
  conversion: '流转数',
  // internalConversion: '内部流转数',
  // externalConversion: '外部流转数',
  firstReplyTimeAVG: '平均首次回复时间',
  replyTimeAVG: '平均回复时间',
  naturalReplyTimeAVG: '平均回复自然时间',
  replyCount: '对外回复数',
  internalReplyCount: '对内回复数',
};
export const STATUS_LOCALE = {
  accepted: '受理中',
  waiting: '等待回复',
};

const RANGE_DATE = ['lastWeek', 'week', 'month', 'lastMonth'] as const;
const RANGE_DATE_LOCALE = {
  lastWeek: '上周',
  week: '本周',
  month: '本月',
  lastMonth: '上个月',
};
export const defaultDateRange = relativeDateGetters['week']();
export const RangePicker = ({
  values,
  onChange,
}: {
  values: [Date, Date];
  onChange?: (values: [Date, Date]) => void;
}) => {
  const rangeDates = useMemo(() => {
    return RANGE_DATE.reduce(
      (pre, curr) => {
        const key = RANGE_DATE_LOCALE[curr];
        const dateRange = relativeDateGetters[curr]();
        pre[key] = [moment(dateRange.from), moment(dateRange.to)];
        return pre;
      },
      {} as {
        [key: string]: [moment.Moment, moment.Moment];
      }
    );
  }, []);
  return (
    <DatePicker.RangePicker
      value={[moment(values[0]), moment(values[1])]}
      ranges={rangeDates}
      allowClear
      onChange={(dates: [moment.Moment, moment.Moment]) => {
        onChange && onChange([dates[0].toDate(), dates[1].toDate()]);
      }}
    />
  );
};