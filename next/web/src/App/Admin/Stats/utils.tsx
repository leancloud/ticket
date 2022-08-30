import { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import _ from 'lodash';

import { relativeDateGetters } from '@/utils/date-range';
import { useSearchParams } from '@/utils/useSearchParams';
import { useCustomerServices } from '@/api/user';
import { Select, SelectProps } from '@/components/antd';
import { useGroups } from '@/api/group';

const RANGE_DATE = ['lastSevenDays', 'lastWeek', 'week', 'month', 'lastMonth'] as const;
const RANGE_DATE_LOCALE = {
  lastSevenDays: '最近 7 天',
  lastWeek: '上周',
  week: '本周',
  month: '本月',
  lastMonth: '上个月',
};
export const useRangePicker = (
  fmt = 'YYYY-MM-DD',
  defaultDateRange = relativeDateGetters['lastSevenDays']()
) => {
  const [{ from, to }, { merge }] = useSearchParams();

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
        merge({
          from: moment(dates ? dates[0] : undefined).format(fmt),
          to: moment(dates ? dates[1] : undefined).format(fmt),
        });
      },
    };
  }, [values, rangeDates, fmt, merge]);
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

export const useStatsParams = () => {
  const [{ category, customerService, group }] = useSearchParams();
  const [{ from, to }] = useRangePicker();
  return {
    from,
    to,
    customerService,
    category,
    group,
  };
};

interface Props extends Omit<SelectProps, 'loading' | 'options' | 'onChange' | 'mode'> {
  onGroupChange?: (value: string) => void;
  onCustomerServiceChange?: (value: string) => void;
}

export const CustomerServiceSelect = ({
  onGroupChange,
  onCustomerServiceChange,
  ...rest
}: Props) => {
  const { data: groups, isLoading: groupLoading } = useGroups();
  const { data: customerServices, isLoading: customerServiceLoading } = useCustomerServices();
  const customerServiceOptions = useMemo(() => {
    if (!customerServices) {
      return;
    }
    return customerServices.map((u) => ({
      label: u.nickname,
      value: u.id,
      type: 'customerService',
    }));
  }, [customerServices]);

  const groupOptions = useMemo(() => {
    if (!groups) {
      return;
    }
    return groups.map((g) => ({ label: g.name, value: g.id, type: 'group' }));
  }, [groups]);

  const options = useMemo(() => {
    const options = [];
    if (groupOptions) {
      options.push({
        label: '客服组',
        options: groupOptions,
      });
    }
    if (customerServiceOptions) {
      options.push({
        label: '客服',
        options: customerServiceOptions,
      });
    }
    return options;
  }, [groupOptions, customerServiceOptions]);

  return (
    <Select
      showSearch
      optionFilterProp="label"
      onChange={(value, item) => {
        if (value) {
          const type = (item as { type?: 'group' | 'customerService' }).type;
          if (type === 'customerService') {
            onCustomerServiceChange && onCustomerServiceChange(value);
          }
          if (type === 'group') {
            onGroupChange && onGroupChange(value);
          }
        }
      }}
      {...rest}
      loading={customerServiceLoading || groupLoading}
      options={options}
    />
  );
};
