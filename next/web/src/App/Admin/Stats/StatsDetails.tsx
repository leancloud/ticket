import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import _ from 'lodash';

import { TableOutlined, PieChartOutlined } from '@ant-design/icons';
import { TicketFieldStat, TicketStats, useTicketFieldStats } from '@/api/ticket-stats';
import { useCategories } from '@/api/category';
import { useCustomerServices } from '@/api/customer-service';
import { useFilterData, useStatsParams } from './utils';
import { Pie, Column } from '@/components/Chart';
import { Button, Popover, Radio, Table, TableProps } from '@/components/antd';
import { EvaluationFields, StatsField, STATS_FIELD_LOCALE, useActiveField } from './StatsPage';
import ReplyDetails, { ModalRef } from './ReplyDetails';

type displayMode = 'pieChart' | 'table';

type RequiredKV<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

const timeField = ['naturalReplyTimeAVG', 'replyTimeAVG', 'firstReplyTimeAVG'];
const avgFieldMap: {
  [key in StatsField]?: Array<keyof TicketStats>;
} = {
  naturalReplyTimeAVG: ['naturalReplyTime', 'naturalReplyCount'],
  replyTimeAVG: ['replyTime', 'replyTimeCount'],
  firstReplyTimeAVG: ['firstReplyTime', 'firstReplyCount'],
};
const rateField = ['likeCount', 'dislikeCount'];
const rateFieldMap: {
  [key in StatsField]?: keyof TicketStats;
} = {
  likeCount: 'likeRate',
  dislikeCount: 'dislikeRate',
};

export const formatTime = (value: number | string) => {
  value = Number(value);
  return `${value === 0 ? 0 : (value / 3600).toFixed(2)}  小时`;
};

const valueTransformImpl = (value: [string, Record<string, number>], field: StatsField) => {
  const avgField = avgFieldMap[field];
  const [key, obj] = value;
  const v = avgField ? (obj[avgField[0]] || 0) / (obj[avgField[1]] || 1) : obj[field];
  return [key, { [field]: v }] as [string, Record<string, number>];
};

const valueTransform = (value: [string | Date, Record<string, number>], field: StatsField) => {
  const [date, obj] = value;
  return valueTransformImpl([moment(date).toISOString(), obj], field);
};

const TicketStatsDateColumn = () => {
  const params = useStatsParams();
  const [field] = useActiveField();
  const { data, isFetching, isLoading } = useTicketFieldStats({
    fields: avgFieldMap[field] || [field],
    ...params,
  });
  const [filteredData, { rollup, changeFilter }] = useFilterData(
    data as RequiredKV<TicketFieldStat, 'date'>[] | undefined
  );

  const chartData = useMemo(() => {
    const aggregatedData = _(filteredData)
      .groupBy((v) => {
        return rollup === 'day' ? moment(v.date).format('YYYY-MM-DD') : v.date;
      })
      .mapValues((value) => {
        return Object.keys(value[0]).reduce((pre, curr) => {
          if (curr !== 'date') {
            pre[curr] = _.sumBy(value, curr);
          }
          return pre;
        }, {} as Record<string, number>);
      })
      .toPairs()
      .map((value) => valueTransform(value, field))
      .valueOf();
    if (rollup === 'day') {
      return aggregatedData;
    }
    return aggregatedData.reduce((pre, curr, index) => {
      if (index === 0) {
        pre.push(curr);
      } else {
        const lastDate = moment(_.last(pre)![0]);
        const hours = moment(curr[0]).diff(lastDate, 'hour');
        if (hours > 1) {
          pre = [
            ...pre,
            ...new Array(hours - 1).fill(0).map((v, index) => {
              return [
                moment(lastDate)
                  .add(index + 1, 'hour')
                  .toISOString(),
                {
                  [field]: 0,
                },
              ] as [string, Record<string, number>];
            }),
          ];
        }
        pre.push(curr);
      }
      return pre;
    }, [] as Array<[string, Record<string, number>]>);
  }, [filteredData, rollup]);

  const isTimeField = timeField.includes(field);
  return (
    <Column
      loading={isFetching || isLoading}
      data={chartData}
      tickInterval={isTimeField ? 3600 : undefined}
      formatters={{
        yAxisTick: (value) => {
          if (isTimeField) {
            const displayValue = Number(value) / 3600;
            return `${displayValue} h`;
          }
          return value;
        },
        xAxisTick: (value, item, index) => {
          if (rollup === 'day') {
            return moment(value).format('MM-DD');
          }
          const date = moment(value);
          if (index < 1) {
            return date.format('MM-DD HH:mm');
          }
          const preDate = moment(chartData[index - 1][0]);
          if (preDate.isSame(date, 'day')) {
            return date.format('HH:mm');
          } else {
            return date.format('MM-DD HH:mm');
          }
        },
        xAxisDisplay: isTimeField ? formatTime : undefined,
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
      names={(value) => STATS_FIELD_LOCALE[value as StatsField]}
    />
  );
};

const TicketStatsSelectionColumn = () => {
  const params = useStatsParams();
  const [field] = useActiveField();
  const { data, isFetching, isLoading } = useTicketFieldStats({
    fields: avgFieldMap[field] || [field],
    ...params,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return data
      .filter((v) => v[field])
      .map(({ selection, categoryId, customerServiceId, date, ...rest }) =>
        valueTransformImpl([selection || '其他', rest], field)
      );
  }, [data]);

  return (
    <Column
      loading={isFetching || isLoading}
      data={chartData}
      onSelected={false}
      names={(value) => STATS_FIELD_LOCALE[value as StatsField]}
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
            const firstReplyCount = _.sumBy(values, 'firstReplyCount');
            return {
              [groupByKey]: key,
              value: _.sumBy(values, 'firstReplyTime') / firstReplyCount,
              count: firstReplyCount,
            };
          case 'replyTimeAVG':
            const replyTimeCount = _.sumBy(values, 'replyTimeCount');
            return {
              [groupByKey]: key,
              value: _.sumBy(values, 'replyTime') / replyTimeCount,
              count: replyTimeCount,
            };
          case 'naturalReplyTimeAVG':
            const naturalReplyCount = _.sumBy(values, 'naturalReplyCount');
            return {
              [groupByKey]: key,
              value: _.sumBy(values, 'naturalReplyTime') / naturalReplyCount,
              count: naturalReplyCount,
            };
          case 'likeCount':
            const likeCount = _.sumBy(values, 'likeCount');
            return {
              [groupByKey]: key,
              value: likeCount,
              rate: likeCount / (_.sumBy(values, 'dislikeCount') + likeCount) || 0,
            };
          case 'dislikeCount':
            const dislikeCount = _.sumBy(values, 'dislikeCount');
            return {
              [groupByKey]: key,
              value: dislikeCount,
              rate: dislikeCount / (_.sumBy(values, 'likeCount') + dislikeCount) || 0,
            };
          default:
            return {
              [groupByKey]: key,
              value: _.sumBy(values, field),
            };
        }
      })
      .orderBy(['value'], timeField.includes(field) ? 'asc' : 'desc')
      .map<{ id: string | number; value: number; count?: number; rate?: number }>((v) => {
        return {
          ...v,
          id: v[groupByKey],
        };
      })
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

const TableView = ({
  data,
  loading,
  groupKey,
  names,
}: {
  data?: TicketFieldStat[];
  loading: boolean;
  groupKey: 'categoryId' | 'customerServiceId';
  names: (v?: string) => string;
}) => {
  const [field] = useActiveField();
  const tableData = useTableData(groupKey, data);
  const pagination = usePagination();
  const isTimeField = useMemo(() => timeField.includes(field), [field]);
  const isRateField = useMemo(() => rateField.includes(field), [field]);
  const modalRef = useRef<ModalRef>(null);

  const columns = useMemo(() => {
    const _columns: TableProps<{
      id: string | number;
      value: number;
      count?: number;
      rate?: number;
      customerServiceId?: string;
      categoryId?: string;
    }>['columns'] = [
      {
        title: '排名',
        dataIndex: 'index',
        key: 'index',
        render: (v, obj, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
      },
      {
        title: groupKey === 'categoryId' ? '分类' : '客服',
        dataIndex: groupKey,
        key: groupKey,
        render: (value) => names(value),
      },
      {
        title: STATS_FIELD_LOCALE[field],
        dataIndex: 'value',
        key: 'value',
        render: (value) => (isTimeField ? formatTime(value) : `${value}`),
        sorter: (a, b) => a.value - b.value,
      },
    ];
    if (isTimeField) {
      _columns.push({
        title: '回复数',
        dataIndex: 'count',
        key: 'count',
        defaultSortOrder: 'descend',
        render: (value, rowData) => {
          return (
            <>
              <span className="inline-block min-w-[30px]">{value}</span>
              <Button
                size="small"
                className="ml-4"
                onClick={() =>
                  modalRef.current?.show({
                    categoryId: rowData.categoryId,
                    customerServiceId: rowData.customerServiceId,
                  })
                }
              >
                查看详情
              </Button>
            </>
          );
        },
        sorter: (a, b) => a.count! - b.count!,
      });
    }
    if (isRateField) {
      _columns.push({
        title: STATS_FIELD_LOCALE[rateFieldMap[field] as 'dislikeRate' | 'likeRate'],
        dataIndex: 'rate',
        key: 'rate',
        defaultSortOrder: 'descend',
        render: (value) => `${(value * 100).toFixed(1)} %`,
        sorter: (a, b) => a.rate! - b.rate!,
      });
    }
    return _columns;
  }, [pagination, names, isTimeField]);

  return (
    <>
      <Table
        className="w-full p-4"
        loading={loading}
        rowKey={(v) => v.id}
        pagination={tableData.length < 10 ? false : pagination}
        columns={columns}
        dataSource={tableData}
      />
      <ReplyDetails ref={modalRef} />
    </>
  );
};

const CategoryStats: React.FunctionComponent<{ displayMode: displayMode }> = ({ displayMode }) => {
  const [field] = useActiveField();
  const params = useStatsParams();
  const { data: categories } = useCategories();
  const { data, isFetching, isLoading } = useTicketFieldStats({
    ...params,
    category: params.category ?? '*',
    fields: avgFieldMap[field] || [field],
    bySelection: false,
  });
  const rootCategoryId = params.category;
  const categoryMap = useMemo(() => _.keyBy(categories || [], 'id'), [categories]);
  const categoryNameMap = useMemo(() => _.mapValues(categoryMap, 'name'), [categoryMap]);
  const categoryFormat = useMemo(() => {
    const getFullPath = (id?: string): string[] => {
      if (!id) return [];
      const category = categoryMap[id];
      if (!category) return [];
      return [
        ...(category.parentId && category.parentId !== rootCategoryId
          ? getFullPath(category.parentId)
          : []),
        categoryNameMap[id],
      ];
    };
    return (id?: string) => getFullPath(id).join(' / ');
  }, [categoryMap, categoryNameMap, rootCategoryId]);
  const total = useMemo(() => (data ? _.sumBy(data, field) : 1), [data, field]);
  const chartData = usePieChartData('categoryId', data);
  if (displayMode === 'table') {
    return (
      <TableView
        loading={isFetching || isLoading}
        data={data}
        names={categoryFormat}
        groupKey="categoryId"
      />
    );
  }
  return (
    <Pie
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
  const params = useStatsParams();
  const { data: customerServices } = useCustomerServices();
  const { data, isFetching, isLoading } = useTicketFieldStats({
    ...params,
    fields: avgFieldMap[field] || [field],
    customerService: params.customerService
      ? params.customerService
      : params.group
      ? undefined
      : '*',
    bySelection: false,
  });
  const customerServiceFormat = useMemo(() => {
    const customerServiceMap = _.mapValues(
      _.keyBy(customerServices || [], 'id'),
      (v) => v.nickname || v.username || v.id
    );
    return (value?: string | number | null) => (value ? customerServiceMap[value] : 'none');
  }, [customerServices]);
  const total = useMemo(() => (data ? _.sumBy(data, field) : 0), [data]);
  const chartData = usePieChartData('customerServiceId', data);
  if (displayMode === 'table') {
    return (
      <TableView
        loading={isFetching || isLoading}
        data={data}
        names={customerServiceFormat}
        groupKey="customerServiceId"
      />
    );
  }
  return (
    <Pie
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
        {field !== 'created' && (
          <div className="w-1/2 min-w-[300px] flex-grow ">
            <CustomerServiceStats displayMode={displayMode} />
          </div>
        )}
        <div className="w-1/2 min-w-[300px] flex-grow ">
          <CategoryStats displayMode={displayMode} />
        </div>
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
        {EvaluationFields.includes(field) ? (
          <TicketStatsSelectionColumn />
        ) : (
          <TicketStatsDateColumn />
        )}
      </div>
      <Details />
    </div>
  );
}
