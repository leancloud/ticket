import { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import _ from 'lodash';

import { relativeDateGetters } from '@/utils/date-range';
import { useSearchParams } from '@/utils/useSearchParams';

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
export const STATS_FIELD_LOCALE: Record<string, string> = {
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
export const STATUS_LOCALE: Record<string, string> = {
  notProcessed: '未处理',
  waitingCustomer: '等待用户回复',
  waitingCustomerService: '等待客服回复',
  preFulfilled: '待用户确认解决',
  fulfilled: '已解决',
  closed: '已关闭',
};

const RANGE_DATE = ['lastSevenDays', 'lastWeek', 'week', 'month', 'lastMonth'] as const;
const RANGE_DATE_LOCALE = {
  lastSevenDays: '最近 7 天',
  lastWeek: '上周',
  week: '本周',
  month: '本月',
  lastMonth: '上个月',
};
const defaultDateRange = relativeDateGetters['lastSevenDays']();
export const useRangePicker = (fmt = 'YYYY-MM-DD') => {
  const [{ from, to, ...rest }, { set }] = useSearchParams();
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

  const values = useMemo(() => {
    return {
      from: from ? moment(from).startOf('day').toDate() : moment(defaultDateRange.from).toDate(),
      to: to ? moment(to).endOf('day').toDate() : moment(defaultDateRange.to).toDate(),
    };
  }, [from, to]);

  const options = useMemo(() => {
    return {
      value: [moment(values.from), moment(values.to)] as [moment.Moment, moment.Moment],
      ranges: rangeDates,
      allowClear: true,
      format: fmt,
      onChange: (dates: [moment.Moment | null, moment.Moment | null] | null) => {
        set({
          ...rest,
          from: moment(dates ? dates[0] : undefined).format(fmt),
          to: moment(dates ? dates[1] : undefined).format(fmt),
        });
      },
    };
  }, [values, rangeDates, fmt]);
  return [values, options] as const;
};

export const getRollUp = (from?: Date | string, to?: Date | string) => {
  if (!from || !to) {
    return 'day';
  }
  const milliseconds = moment(to).toDate().getTime() - moment(from).toDate().getTime();
  if (milliseconds > 2 * 24 * 60 * 60 * 1000) {
    return 'day';
  }
  return 'hour';
};

export const useFilterData = <T extends { date: string | Date }>(data: T[] = []) => {
  const [filter, setFilter] = useState<{ from?: string | Date; to?: string | Date }>({});
  useEffect(() => {
    if (data.length > 0) {
      setFilter((v) => {
        if (v.from || v.to) {
          return {};
        }
        return v;
      });
    }
  }, [data]);
  const changeFilter = useCallback((from?: string | Date, to?: string | Date) => {
    if (!from || !to) {
      setFilter((v) => {
        if (v.from || v.to) {
          return {};
        }
        return v;
      });
    } else {
      setFilter({
        from,
        to,
      });
    }
  }, []);

  const filteredData = useMemo(() => {
    if (filter.from && filter.to) {
      return data.filter((v) => {
        return (
          moment(v.date).isSameOrAfter(moment(filter.from)) &&
          moment(v.date).isSameOrBefore(moment(filter.to))
        );
      });
    }
    return data;
  }, [data, filter]);

  const rollup = useMemo(() => getRollUp(_.first(filteredData)?.date, _.last(filteredData)?.date), [
    filteredData,
  ]);

  return [
    filteredData,
    {
      rollup,
      changeFilter,
    },
  ] as const;
};
