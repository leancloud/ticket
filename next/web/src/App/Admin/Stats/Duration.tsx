import { useState } from 'react';
import moment, { Moment } from 'moment';

import { DatePicker, Table } from '@/components/antd';
import { useDurationMetrics } from '@/api/metrics';
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

  const { data, isLoading } = useDurationMetrics({
    from: dateRange[0].toDate(),
    to: dateRange[1].toDate(),
    page,
    pageSize,
    orderBy,
  });

  const renderNumber = (value?: number) => {
    if (value === undefined) {
      return '-';
    }
    const hours = value / 1000 / 60 / 60;
    return hours.toFixed(2) + ' 小时';
  };

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
        onChange={(pagination, filters, sorter) => {
          console.log(sorter);
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
            render: (ticket: TicketSchema) => <TicketLink ticket={ticket} />,
          },
          {
            title: '首次回复时间',
            dataIndex: 'firstReplyTime',
            render: renderNumber,
            sorter: true,
            sortOrder: getSortOrder('firstReplyTime'),
          },
          {
            title: '请求者等待时间',
            dataIndex: 'requesterWaitTime',
            render: renderNumber,
            sorter: true,
            sortOrder: getSortOrder('requesterWaitTime'),
          },
          {
            title: '客服等待时间',
            dataIndex: 'agentWaitTime',
            render: renderNumber,
            sorter: true,
            sortOrder: getSortOrder('agentWaitTime'),
          },
          {
            title: '首次解决时间',
            dataIndex: 'firstResolutionTime',
            render: renderNumber,
            sorter: true,
            sortOrder: getSortOrder('firstResolutionTime'),
          },
          {
            title: '完全解决时间',
            dataIndex: 'fullResolutionTime',
            render: renderNumber,
            sorter: true,
            sortOrder: getSortOrder('fullResolutionTime'),
          },
        ]}
      />
    </div>
  );
}
