import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import _ from 'lodash';

import { useSearchParams } from '@/utils/useSearchParams';
import { TableOutlined, PieChartOutlined } from '@ant-design/icons';
import { TicketFieldStat, TicketStats, useTicketFieldStats } from '@/api/ticket-stats';
import { useCategories } from '@/api/category';
import { useCustomerServices } from '@/api/customer-service';
import { StatsField, STATS_FIELD_LOCALE, useRangePicker, getRollUp } from './utils';
import { StatsPie, StatsColumn } from './Chart';
import { Popover, Radio, Table } from '@/components/antd';
import { useActiveField } from './StatsPage';

type displayMode = 'pieChart' | 'table';

const timeField = ['naturalReplyTimeAVG', 'replyTimeAVG', 'firstReplyTimeAVG'];
const avgFieldMap: {
  [key in StatsField]?: Array<keyof TicketStats>;
} = {
  naturalReplyTimeAVG: ['naturalReplyTime', 'naturalReplyCount'],
  replyTimeAVG: ['replyTime', 'replyTimeCount'],
  firstReplyTimeAVG: ['firstReplyTime', 'firstReplyCount'],
};

const useFilterChartData = (
  tranform: (v: TicketFieldStat) => Record<string, number>,
  data: TicketFieldStat[] = []
) => {
  const $transform = useRef(tranform);
  $transform.current = tranform;
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

  const chartData = useMemo(() => {
    if (rollup === 'day') {
      return _(filteredData)
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
        .map(
          (v) =>
            [moment(v.date).toISOString(), $transform.current(v)] as [
              string,
              Record<string, number>
            ]
        )
        .valueOf();
    }
    return filteredData.map((v) => {
      return [moment(v.date).toISOString(), $transform.current(v)] as [
        string,
        Record<string, number>
      ];
    });
  }, [filteredData, rollup]);

  return [
    chartData,
    {
      rollup,
      changeFilter,
    },
  ] as const;
};

const TicketStatsColumn = () => {
  const [{ from, to }] = useRangePicker();
  const [field] = useActiveField();
  const [{ category, customerService }] = useSearchParams();
  const params = useMemo(() => {
    const fields = avgFieldMap[field];
    return {
      from,
      to,
      fields: fields || [field],
      category,
      customerService,
    };
  }, [field, from, to, category, customerService]);
  const { data, isFetching, isLoading } = useTicketFieldStats(params);
  const [chartData, { rollup, changeFilter }] = useFilterChartData((v) => {
    const avgField = avgFieldMap[field];
    const value = avgField ? (v[avgField[0]] || 0) / (v[avgField[1]] || 1) : v[field];
    return {
      [field]: value!,
    };
  }, data);

  const xAxisDisplay = useMemo(() => {
    if (timeField.includes(field)) {
      return (value: number) => {
        const hours = value / 3600;
        if (hours < 1) {
          return `${hours.toFixed(2)} 小时`;
        }
        return `${hours.toFixed(2)} 小时`;
      };
    }
    return;
  }, [field]);

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
        xAxisTick: (value) => {
          if (rollup === 'day') {
            return moment(value).format('YYYY-MM-DD');
          }
          const date = moment(value);
          return date.format('HH:mm');
        },
        xAxisDisplay,
        titleDisplay: (value) =>
          moment(value).format(rollup === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm'),
      }}
      onSelected={(xAxisValues) => {
        if (xAxisValues === undefined) {
          changeFilter();
        } else {
          const from = _.first(xAxisValues);
          const to = _.last(xAxisValues);
          if (rollup === 'day') {
            changeFilter(moment(from).startOf('day').toDate(), moment(to).endOf('day').toDate());
          } else {
            if (from !== to) {
              changeFilter(from, to);
            }
          }
        }
      }}
      names={(value) => STATS_FIELD_LOCALE[value]}
    />
  );
};

const getPercentaget = (value: number | string, total = 1) => {
  if (total < 0) {
    total = 1;
  }
  value = Number(value);
  return ((value / total) * 100).toFixed(2) + '%';
};

const formatTime = (value: number | string) => {
  value = Number(value);
  return (value / 3600).toFixed(2) + ' 小时';
};

const usePieChartData = (groupByKey: string, data?: TicketFieldStat[]) => {
  const [field] = useActiveField();
  return useMemo(() => {
    if (!data || timeField.includes(field)) {
      return [];
    }
    return _(data)
      .groupBy(groupByKey)
      .map((values, key) => {
        return [key, _.sumBy(values, field)] as [string, number];
      })
      .valueOf();
  }, [data, groupByKey, field]);
};

const useTableData = (groupByKey: string, data?: TicketFieldStat[]) => {
  const [field] = useActiveField();
  return useMemo(() => {
    return _(data)
      .groupBy(groupByKey)
      .map((values, key) => {
        switch (field) {
          case 'firstReplyTimeAVG':
            return {
              [groupByKey]: key,
              value: _.sumBy(values, 'firstReplyTime') / _.sumBy(values, 'firstReplyCount'),
            };
          case 'replyTimeAVG':
            return {
              [groupByKey]: key,
              value: _.sumBy(values, 'replyTime') / _.sumBy(values, 'replyTimeCount'),
            };
          case 'naturalReplyTimeAVG':
            return {
              [groupByKey]: key,
              value: _.sumBy(values, 'naturalReplyTime') / _.sumBy(values, 'naturalReplyCount'),
            };
          default:
            return {
              [groupByKey]: key,
              value: _.sumBy(values, field),
            };
        }
      })
      .orderBy(['value'], 'desc')
      .valueOf();
  }, [groupByKey, data, field]);
};

const usePagination = () => {
  const [pageSize, setPageSize] = useState(10);
  const [current, setCurrent] = useState(1);
  const onChange = useCallback((page: number, pageSize: number) => {
    setCurrent(page);
    setPageSize(pageSize);
  }, []);
  return {
    pageSize,
    current,
    onChange,
  };
};

const CategoryStats: React.FunctionComponent<{ displayMode: displayMode }> = ({ displayMode }) => {
  const [field] = useActiveField();
  const [{ from, to }] = useRangePicker();
  const [{ customerService }] = useSearchParams();
  const { data: categories } = useCategories();
  const { data, isFetching, isLoading } = useTicketFieldStats({
    from,
    to,
    fields: avgFieldMap[field] || [field],
    category: '*',
    customerService: customerService,
  });
  const pagination = usePagination();
  const categoryFormat = useMemo(() => {
    const categoryMap = _.mapValues(_.keyBy(categories || [], 'id'), 'name');
    return (value?: string) => (value ? categoryMap[value] : 'none');
  }, [categories]);
  const total = useMemo(() => (data ? _.sumBy(data, field) : 1), [data]);
  const tableData = useTableData('categoryId', data);
  const chartData = usePieChartData('categoryId', data);
  if (displayMode === 'table') {
    return (
      <Table
        className="w-full p-4"
        loading={isLoading || isFetching}
        rowKey={(v) => v.categoryId}
        pagination={pagination}
        columns={[
          {
            title: '排名',
            dataIndex: 'index',
            key: 'index',
            render: (v, obj, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
          },
          {
            title: '分类',
            dataIndex: 'categoryId',
            key: 'categoryId',
            render: (value) => categoryFormat(value),
          },
          {
            title: STATS_FIELD_LOCALE[field],
            dataIndex: 'value',
            key: 'value',
            render: (value) => (timeField.includes(field) ? formatTime(value) : `${value}`),
          },
        ]}
        dataSource={tableData}
      />
    );
  }
  return (
    <StatsPie
      data={chartData}
      loading={isLoading || isFetching}
      names={categoryFormat}
      formatters={{
        valueDisplay: (value) => `${value} (${getPercentaget(value, total)})`,
      }}
    />
  );
};

const CustomerServiceStats: React.FunctionComponent<{ displayMode: displayMode }> = ({
  displayMode,
}) => {
  const [field] = useActiveField();
  const [{ from, to }] = useRangePicker();
  const [{ category }] = useSearchParams();
  const { data: customerServices } = useCustomerServices();
  const { data, isFetching, isLoading } = useTicketFieldStats({
    from,
    to,
    fields: avgFieldMap[field] || [field],
    category,
    customerService: '*',
  });
  const pagination = usePagination();
  const customerServiceFormat = useMemo(() => {
    const customerServiceMap = _.mapValues(
      _.keyBy(customerServices || [], 'id'),
      (v) => v.nickname || v.username || v.id
    );
    return (value?: string | number | null) => (value ? customerServiceMap[value] : 'none');
  }, [customerServices]);
  const total = useMemo(() => (data ? _.sumBy(data, field) : 0), [data]);
  const tableData = useTableData('customerServiceId', data);
  const chartData = usePieChartData('customerServiceId', data);
  if (displayMode === 'table') {
    return (
      <Table
        className="p-4 w-full"
        pagination={pagination}
        loading={isLoading || isFetching}
        rowKey={(v) => v.customerServiceId}
        columns={[
          {
            title: '排名',
            dataIndex: 'customerServiceId',
            render: (v, obj, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
          },
          {
            title: '客服',
            dataIndex: 'customerServiceId',
            render: (value) => customerServiceFormat(value),
          },
          {
            title: STATS_FIELD_LOCALE[field],
            dataIndex: 'value',
            render: (value) => (timeField.includes(field) ? formatTime(value) : value),
          },
        ]}
        dataSource={tableData}
      />
    );
  }
  return (
    <StatsPie
      data={chartData}
      loading={isLoading || isFetching}
      names={customerServiceFormat}
      formatters={{
        valueDisplay: (value) => `${value} (${getPercentaget(value, total)})`,
      }}
    />
  );
};

const Details = () => {
  const [field] = useActiveField();
  const [{ category, customerService }] = useSearchParams();
  const [displayMode, setDisplayMode] = useState<displayMode>('pieChart');
  const onlyTable = useMemo(() => timeField.includes(field), [field]);
  useEffect(() => {
    if (onlyTable) {
      setDisplayMode('table');
    }
  }, [onlyTable]);
  return (
    <div className="mt-4">
      <Radio.Group
        onChange={(e) => setDisplayMode(e.target.value)}
        value={displayMode}
        optionType="button"
      >
        <Popover content="组成">
          <Radio.Button value="pieChart" disabled={onlyTable}>
            <PieChartOutlined />
          </Radio.Button>
        </Popover>
        <Popover content="排名">
          <Radio.Button value="table">
            <TableOutlined />
          </Radio.Button>
        </Popover>
      </Radio.Group>

      <div className="relative flex basis-1/2 flex-wrap min-h-[400px] justify-around">
        {!customerService && field !== 'created' && (
          <div className="w-1/2 min-w-[300px] flex-grow ">
            <CustomerServiceStats displayMode={displayMode} />
          </div>
        )}
        {!category && (
          <div className="w-1/2 min-w-[300px] flex-grow ">
            <CategoryStats displayMode={displayMode} />
          </div>
        )}
      </div>
    </div>
  );
};

export function StatsDetails() {
  const [field] = useActiveField();
  return (
    <div className="w-full">
      <h2>{STATS_FIELD_LOCALE[field]}</h2>
      <div className="w-full relative">
        <TicketStatsColumn />
      </div>
      <Details />
    </div>
  );
}
