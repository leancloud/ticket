import { useMemo, useState } from 'react';
import moment, { Moment } from 'moment';

import { Button, DatePicker, Input, InputNumber, Table, TableColumnType } from '@/components/antd';
import { DurationMetricsFilters, useDurationMetrics } from '@/api/metrics';
import { TicketSchema } from '@/api/ticket';
import { TicketLink } from '../components/TicketLink';

const { RangePicker } = DatePicker;

export function DurationStatistics() {
  const [dateRange, setDateRange] = useState<[Moment, Moment]>(() => [
    moment().startOf('day').subtract(6, 'days'),
    moment().endOf('day'),
  ]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [orderBy, setOrderBy] = useState<string>();
  const [filters, setFilters] = useState<DurationMetricsFilters>({});

  const { data, isLoading } = useDurationMetrics({
    from: dateRange[0].toDate(),
    to: dateRange[1].toDate(),
    page,
    pageSize,
    orderBy,
    filters,
  });

  const getSortOrder = (key: string) => {
    if (orderBy) {
      if (orderBy === key) {
        return 'ascend' as const;
      }
      if (orderBy === key + '-desc') {
        return 'descend' as const;
      }
    }
    return null;
  };

  const getColumn = (
    title: string,
    dataIndex: keyof DurationMetricsFilters
  ): TableColumnType<any> => {
    return {
      title,
      dataIndex,
      render: renderMsAsHour,
      sorter: true,
      sortOrder: getSortOrder(dataIndex),
      filterDropdown: ({ selectedKeys, setSelectedKeys, confirm }) => {
        const value = selectedKeys[0] as string | undefined;
        return (
          <FilterDropdown
            value={value}
            onChange={(value) => setSelectedKeys(value ? [value] : [])}
            onConfirm={() => {
              confirm();
              setFilters((filters) => ({ ...filters, [dataIndex]: value }));
            }}
          />
        );
      },
    };
  };

  return (
    <div className="p-10">
      <div className="mb-6">
        <RangePicker
          allowClear={false}
          value={dateRange}
          onChange={(value) => {
            if (value && value[0] && value[1]) {
              setDateRange([value[0], value[1]]);
            }
          }}
        />
      </div>

      <Table
        dataSource={data?.data}
        loading={isLoading}
        rowKey="id"
        pagination={{
          total: data?.totalCount,
          current: page,
          pageSize,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
        }}
        scroll={{ x: 'max-content' }}
        onChange={(pagination, filters, sorter) => {
          if (Array.isArray(sorter)) {
            return;
          }
          if (sorter.column && sorter.order) {
            const suffix = sorter.order === 'descend' ? '-desc' : '';
            setOrderBy(sorter.column.dataIndex! + suffix);
          } else {
            setOrderBy(undefined);
          }
        }}
        columns={[
          {
            title: '工单',
            dataIndex: 'ticket',
            render: (ticket: TicketSchema) => <TicketLink className="max-w-lg" ticket={ticket} />,
          },
          getColumn('首次回复时间', 'firstReplyTime'),
          getColumn('请求者等待时间', 'requesterWaitTime'),
          getColumn('客服等待时间', 'agentWaitTime'),
          getColumn('首次解决时间', 'firstResolutionTime'),
          getColumn('完全解决时间', 'fullResolutionTime'),
        ]}
      />
    </div>
  );
}

interface FilterDropdownProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  onConfirm: () => void;
}

function FilterDropdown({ value, onChange, onConfirm }: FilterDropdownProps) {
  const [min, max] = useMemo(() => {
    if (value) {
      const items = value.split('..');
      if (items.length === 2) {
        return items.map((v) => {
          if (v === '*') {
            return undefined;
          }
          return msToHour(parseInt(v));
        });
      }
    }
    return [undefined, undefined];
  }, [value]);

  const handleChange = (min?: number | null, max?: number | null) => {
    if ([min, max].every((v) => v === null || v === undefined)) {
      return onChange(undefined);
    }
    onChange([min, max].map((v) => (typeof v === 'number' ? hourToMs(v) : '*')).join('..'));
  };

  return (
    <div className="p-2">
      <Input.Group compact>
        <InputNumber
          size="small"
          placeholder="最小值"
          min={0}
          value={min}
          onChange={(v) => handleChange(v, max)}
        />
        <InputNumber
          size="small"
          placeholder="最大值"
          min={0}
          value={max}
          onChange={(v) => handleChange(min, v)}
        />
      </Input.Group>
      <div className="mt-2 space-x-1 text-right">
        <Button type="link" size="small" onClick={() => onChange(undefined)}>
          重置
        </Button>
        <Button type="primary" size="small" onClick={() => onConfirm()}>
          确定
        </Button>
      </div>
    </div>
  );
}

function msToHour(value: number) {
  return value / 1000 / 60 / 60;
}

function hourToMs(value: number) {
  return Math.floor(value * 1000 * 60 * 60);
}

function renderMsAsHour(value?: number) {
  if (value === undefined) {
    return '-';
  }
  return msToHour(value).toFixed(2) + ' 小时';
}
