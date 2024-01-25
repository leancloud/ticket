import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { Button, DatePicker, Table, TableProps, Tooltip } from 'antd';
import moment, { Moment } from 'moment';

import { CustomerServiceSelect } from '@/components/common';
import {
  CustomerServiceActionLog as Log,
  getCustomerServiceActionLogs,
  GetCustomerServiceActionLogsOptions,
} from '@/api/customer-service';
import { TicketSchema } from '@/api/ticket';
import { TicketLink } from '@/App/Admin/components/TicketLink';
import { AsyncUserLabel } from '@/App/Admin/components/UserLabel';
import { CategoryTag, DiffFields, GroupLabel } from '@/App/Admin/Tickets/Ticket/components/OpsLog';
import { SimpleModal } from './components/SimpleModal';

const { RangePicker } = DatePicker;

const columns: TableProps<Log>['columns'] = [
  {
    dataIndex: 'ticket',
    title: '工单',
    render: (ticket?: TicketSchema) => {
      return <div className="flex">{ticket ? <TicketLink ticket={ticket} /> : '已删除'}</div>;
    },
  },
  {
    dataIndex: 'ts',
    title: '操作时间',
    render: (ts: string) => moment(ts).format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    key: 'action',
    title: '操作',
    render: (log: Log) => {
      if (log.type === 'reply') {
        const replyType = log.reply ? (log.reply.internal ? '内部回复' : '公开回复') : '回复';
        switch (log.revision.action) {
          case 'create':
            return '创建' + replyType;
          case 'update':
            return '修改' + replyType;
          case 'delete':
            return '删除' + replyType;
        }
      }
      switch (log.opsLog.action) {
        case 'changeAssignee':
          return '修改负责人';
        case 'changeCategory':
          return '修改分类';
        case 'changeFields':
          return '修改自定义字段值';
        case 'changeGroup':
          return '修改客服组';
        case 'close':
        case 'reject':
        case 'resolve':
          return '关闭工单';
        case 'reopen':
          return '重新打开工单';
        case 'replySoon':
          return '稍后回复工单';
        case 'replyWithNoContent':
          return '认为工单无需回复';
        default:
          return log.opsLog.action;
      }
    },
  },
  {
    key: 'detail',
    title: '详情',
    render: (log: Log) => {
      if (log.type === 'reply') {
        return (
          <Tooltip title={log.revision.content} placement="left">
            <div className="max-w-[400px] truncate">{log.revision.content}</div>
          </Tooltip>
        );
      }
      switch (log.opsLog.action) {
        case 'changeAssignee':
          return log.opsLog.assigneeId ? (
            <AsyncUserLabel userId={log.opsLog.assigneeId} />
          ) : (
            '<未分配>'
          );
        case 'changeCategory':
          return <CategoryTag categoryId={log.opsLog.categoryId} />;
        case 'changeFields':
          return (
            <SimpleModal title="字段修改记录" trigger={<a>查看</a>} footer={null}>
              <DiffFields changes={log.opsLog.changes} />
            </SimpleModal>
          );
        case 'changeGroup':
          return log.opsLog.groupId ? <GroupLabel groupId={log.opsLog.groupId} /> : '<未分配>';
      }
      return '-';
    },
  },
];

const pageSize = 20;

function getLogId(log: Log) {
  switch (log.type) {
    case 'reply':
      return log.revision.id;
    case 'opsLog':
      return log.opsLog.id;
  }
}

export function CustomerServiceAction() {
  const [filters, setFilters] = useState<{
    dateRange: [Moment, Moment];
    customerServiceId?: string;
  }>(() => ({
    dateRange: [moment().startOf('day'), moment().endOf('day')],
  }));

  const [pagination, setPagination] = useState<{
    cursor?: Moment;
    desc?: boolean;
    hasPrevPage?: boolean;
    hasNextPage?: boolean;
  }>({});

  const options = useMemo<GetCustomerServiceActionLogsOptions | undefined>(() => {
    if (!filters.customerServiceId) {
      return;
    }
    const window = pagination.desc
      ? [filters.dateRange[0], pagination.cursor || filters.dateRange[1]]
      : [pagination.cursor || filters.dateRange[0], filters.dateRange[1]];
    return {
      customerServiceId: filters.customerServiceId,
      from: window[0].toISOString(),
      to: window[1].toISOString(),
      // 多拿一个用来判断是否还有下一页
      pageSize: pageSize + 1,
      desc: pagination.desc || undefined,
    };
  }, [filters, pagination.cursor, pagination.desc]);

  const { data, isLoading } = useQuery({
    enabled: !!options,
    queryKey: ['CustomerServiceActionLogs', options],
    queryFn: () => getCustomerServiceActionLogs(options!),
    keepPreviousData: true,
  });

  const logs = useMemo(() => {
    if (pagination.desc) {
      return data?.slice(0, pageSize).reverse();
    } else {
      return data?.slice(0, pageSize);
    }
  }, [data, pagination.desc]);

  const handleChangeFilters = (next: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPagination({});
  };

  const changePage = (direction: 'prev' | 'next') => {
    if (!logs || !logs.length) return;
    if (direction === 'prev') {
      const firstLog = logs[0];
      setPagination({
        cursor: moment(firstLog.ts).subtract(1, 'ms'),
        desc: true,
        hasNextPage: true,
      });
    } else {
      const lastLog = logs[logs.length - 1];
      setPagination({
        cursor: moment(lastLog.ts).add(1, 'ms'),
        hasPrevPage: true,
      });
    }
  };

  useEffect(() => {
    if (data) {
      if (pagination.desc) {
        setPagination((prev) => ({ ...prev, hasPrevPage: data.length > pageSize }));
      } else {
        setPagination((prev) => ({ ...prev, hasNextPage: data.length > pageSize }));
      }
    }
  }, [data, pagination.desc]);

  return (
    <div className="p-10">
      <div className="space-x-2 mb-5">
        <RangePicker
          allowClear={false}
          value={filters.dateRange}
          onChange={(value) => {
            if (value && value[0] && value[1]) {
              handleChangeFilters({
                dateRange: [value[0], value[1]],
              });
            }
          }}
        />

        <CustomerServiceSelect
          placeholder="请选择客服"
          value={filters.customerServiceId}
          onChange={(id) => handleChangeFilters({ customerServiceId: id as string })}
          style={{ minWidth: 160 }}
        />
      </div>

      <Table
        dataSource={logs}
        rowKey={getLogId}
        columns={columns}
        pagination={false}
        loading={isLoading}
        scroll={{ x: 'max-content' }}
      />

      <div className="mt-5 text-center">
        <Button.Group>
          <Button
            disabled={!pagination.hasPrevPage || isLoading}
            onClick={() => changePage('prev')}
          >
            上一页
          </Button>
          <Button
            disabled={!pagination.hasNextPage || isLoading}
            onClick={() => changePage('next')}
          >
            下一页
          </Button>
        </Button.Group>
      </div>
    </div>
  );
}
