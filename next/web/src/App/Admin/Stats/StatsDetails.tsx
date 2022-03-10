import { useSearchParams } from '@/utils/useSearchParams';
import moment from 'moment';
import { useMemo } from 'react';
import classnames from 'classnames';
import _, { values } from 'lodash';

import { TicketStats, useTicketFieldStats, useTicketStatus } from '@/api/ticket-stats';
import { useCategories } from '@/api/category';
import { useCustomerServices } from '@/api/customer-service';
import { defaultDateRange, StatsField, STATS_FIELD_LOCALE, STATUS_FIELD, STATUS_LOCALE } from '.';
import { StatsPie, StatsColumn, StatsLine } from './StatsChart';
import { Divider } from '@/components/antd';

const avgFieldMap: {
  [key in StatsField]?: Array<keyof TicketStats>;
} = {
  replyTimeAVG: ['replyTime', 'replyTimeCount'],
  firstReplyTimeAVG: ['firstReplyTime', 'firstReplyCount'],
};
const timeField = ['firstReplyTimeAVG', 'replyTimeAVG'];

const getRollUp = (from?: Date | string, to?: Date | string) => {
  if (!from || !to) {
    return 'hour';
  }
  const milliseconds = moment(to).toDate().getTime() - moment(from).toDate().getTime();
  if (milliseconds > 2 * 24 * 60 * 60 * 1000) {
    return 'day';
  }
  return 'hour';
};
const timeFormatter = (value: number) => {
  const hours = value / 3600;
  if (hours < 1) {
    return `${hours.toFixed(2)} 小时`;
  }
  return `${hours.toFixed(2)} 小时`;
};
const TicketStatsColumn: React.FunctionComponent<{ field: StatsField }> = ({ field }) => {
  const [
    { from = defaultDateRange.from, to = defaultDateRange.to, category, customerService },
  ] = useSearchParams();
  const params = useMemo(() => {
    const fields = avgFieldMap[field];
    return {
      from: moment(from).toDate(),
      to: moment(to).toDate(),
      fields: fields || [field],
      category,
      customerService,
    };
  }, [field, from, to, category, customerService]);
  const { data, isFetching, isLoading } = useTicketFieldStats(params);
  const rollup = useMemo(() => getRollUp(from, to), [from, to]);
  const chartData = useMemo(() => {
    if (!data) {
      return;
    }
    let chartData = data;
    if (rollup === 'day') {
      chartData = _(chartData)
        .groupBy((v) => {
          return moment(v.date).format('YYYY-MM-DD');
        })
        .mapValues((value, key) => {
          return Object.keys(value[0]).reduce(
            (pre, curr) => {
              if (curr !== 'date') {
                pre[curr as StatsField] = _.sumBy(value, curr);
              }
              return pre;
            },
            {} as {
              [key in StatsField]: number;
            }
          );
        })
        .toPairs()
        .map(([date, values]) => {
          return {
            date: moment(date).toDate(),
            ...values,
          };
        })
        .orderBy('date')
        .valueOf();
    }
    const avgField = avgFieldMap[field];
    return chartData.map((v) => {
      const value = avgField ? (v[avgField[0]] || 0) / (v[avgField[1]] || 1) : v[field];
      return [v.date, value] as [Date, number];
    });
  }, [data, rollup]);

  const tooltipFormatter = (value: number | string) => {
    return {
      name: STATS_FIELD_LOCALE[field],
      value: timeField.includes(field) ? timeFormatter(Number(value)) : value,
    };
  };
  return (
    <StatsColumn
      loading={isFetching || isLoading}
      data={chartData}
      tickInterval={timeField.includes(field) ? 3600 : undefined}
      formatters={{
        yAxisTick: (value) => {
          if (timeField.includes(field)) {
            const displayValue = Number(value) / 3600;
            return `${displayValue} h`;
          }
          return value;
        },
        xAxisTick: (value, item, index) => {
          if (rollup === 'day') {
            return moment(value).format('YYYY-MM-DD');
          }
          // const preDate = chartData ? chartData[index - 1][0] : undefined;
          const date = moment(value);
          // return date.format(date.isSame(preDate, 'day') ? 'HH:mm' : 'YYYY-MM-DD HH:mm');
          return date.format('HH:mm');
        },
        xAxisDisplay: (value) => {
          console.log(value);
          return moment(value).format('YYYY-MM-DD HH:mm');
        },
      }}
      names={(value) => STATS_FIELD_LOCALE[field]}
    />
  );
};

const CategoryStats: React.FunctionComponent<{ field: StatsField }> = ({ field }) => {
  const [
    { from = defaultDateRange.from, to = defaultDateRange.to, customerService },
  ] = useSearchParams();
  const { data: categories } = useCategories();
  const { data, isFetching, isLoading } = useTicketFieldStats({
    from: moment(from).toDate(),
    to: moment(to).toDate(),
    fields: avgFieldMap[field] || [field],
    category: '*',
    customerService: customerService,
  });
  const chartData = useMemo(() => {
    if (!data) {
      return [];
    }
    return _(data)
      .groupBy('categoryId')
      .map((values, key) => {
        return [key, _.sumBy(values, field)] as [string, number];
      })
      .valueOf();
  }, [data]);
  const categoryFormat = useMemo(() => {
    const categoryMap = _.mapValues(_.keyBy(categories || [], 'id'), 'name');
    return (value?: string) => (value ? categoryMap[value] : 'none');
  }, [categories]);
  const total = useMemo(() => (data ? _.sumBy(data, field) : 0), [data]);
  const valueDisplay = (value: number) => {
    const percent = ((Number(value) / total) * 100).toFixed(2) + '%';
    return `${value} （${percent}）`;
  };
  if (!data || data.length === 0) {
    return null;
  }
  return (
    <div className="basis-1/2 flex-grow max-w-[650px]">
      <StatsPie
        data={chartData}
        loading={isLoading || isFetching}
        names={categoryFormat}
        formatters={{
          valueDisplay,
        }}
      />
    </div>
  );
};

const CustomerServiceStats: React.FunctionComponent<{ field: StatsField }> = ({ field }) => {
  const [{ from = defaultDateRange.from, to = defaultDateRange.to, category }] = useSearchParams();
  const { data: customerServices } = useCustomerServices();
  const { data, isFetching, isLoading } = useTicketFieldStats({
    from: moment(from).toDate(),
    to: moment(to).toDate(),
    fields: avgFieldMap[field] || [field],
    category,
    customerService: '*',
  });
  const chartData = useMemo(() => {
    if (!data) {
      return [];
    }
    return _(data)
      .groupBy('customerServiceId')
      .map((values, key) => {
        return [key, _.sumBy(values, field)] as [string, number];
      })
      .valueOf();
  }, [data]);

  const customerServiceFormat = useMemo(() => {
    const customerServiceMap = _.mapValues(
      _.keyBy(customerServices || [], 'id'),
      (v) => v.nickname || v.username || v.id
    );
    return (value?: string | number | null) => (value ? customerServiceMap[value] : 'none');
  }, [customerServices]);
  const total = useMemo(() => (data ? _.sumBy(data, field) : 0), [data]);
  const valueDisplay = (value: number) => {
    const percent = ((Number(value) / total) * 100).toFixed(2) + '%';
    return `${value} （${percent}）`;
  };
  if (!data || data.length === 0) {
    return null;
  }
  return (
    <div className="basis-1/2 flex-grow max-w-[650px]">
      <StatsPie
        data={chartData}
        loading={isLoading || isFetching}
        names={customerServiceFormat}
        formatters={{
          valueDisplay,
        }}
      />
    </div>
  );
};

const current = moment().subtract(2, 'day');
const StatusStats = () => {
  const { data, isFetching, isLoading } = useTicketStatus({
    from: moment(current).subtract(24, 'hour').toDate(),
    to: current.toDate(),
  });
  const chartData = useMemo(() => {
    if (!data) {
      return;
    }
    return _(data)
      .orderBy('date')
      .map((v) => {
        const { date, id, ...rest } = v;
        return ([date, rest] as unknown) as [Date, Record<string, number>];
      })
      .valueOf();
  }, [data]);
  return (
    <div className="relative h-[400px]">
      <StatsLine
        loading={isFetching || isLoading}
        data={chartData}
        names={(text: string) => STATUS_LOCALE[text as 'waiting' | 'accepted']}
        formatters={{
          xAxisTick: (value) => moment(value).format('HH:mm'),
          xAxisDisplay: (value) => moment(value).format('YYYY-MM-DD HH:mm'),
        }}
      />
    </div>
  );
};

export function StatsDetails({ field }: { field: StatsField }) {
  const [{ category, customerService }] = useSearchParams();
  return (
    <div>
      <h2>{STATS_FIELD_LOCALE[field]}</h2>
      <div className="relative h-[400px]">
        <TicketStatsColumn field={field} />
      </div>
      {!timeField.includes(field) && (
        <div className="relative flex mt-4">
          {!customerService && field !== 'created' && <CustomerServiceStats field={field} />}
          {!category && (
            <div className="basis-1/2 flex-grow  max-w-[650px] ">
              <CategoryStats field={field} />
            </div>
          )}
        </div>
      )}
      <Divider />
      <h2>最近工单状态</h2>
      <StatusStats />
    </div>
  );
}
