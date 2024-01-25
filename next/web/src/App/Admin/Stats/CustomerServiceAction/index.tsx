import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { Button, Table, Tooltip } from 'antd';
import moment, { Moment } from 'moment';
import { keyBy } from 'lodash-es';

import {
  CustomerServiceActionLog as Log,
  GetCustomerServiceActionLogsOptions,
  getCustomerServiceActionLogs,
} from '@/api/customer-service-action-log';
import { TicketLink } from '@/App/Admin/components/TicketLink';
import { CategoryTag, DiffFields, GroupLabel } from '@/App/Admin/Tickets/Ticket/components/OpsLog';
import { SimpleModal } from './components/SimpleModal';
import { FilterForm } from './components/FilterForm';

function renderAction(log: Log) {
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
}

function renderDetail(getUserName: (id: string) => string) {
  return (log: Log) => {
    if (log.type === 'reply') {
      return (
        <Tooltip title={log.revision.content} placement="left">
          <div className="max-w-[400px] truncate">{log.revision.content}</div>
        </Tooltip>
      );
    }
    switch (log.opsLog.action) {
      case 'changeAssignee':
        return log.opsLog.assigneeId ? getUserName(log.opsLog.assigneeId) : '<空>';
      case 'changeCategory':
        return <CategoryTag categoryId={log.opsLog.categoryId} />;
      case 'changeFields':
        return (
          <SimpleModal title="字段修改记录" trigger={<a>查看</a>} footer={null}>
            <DiffFields changes={log.opsLog.changes} />
          </SimpleModal>
        );
      case 'changeGroup':
        return log.opsLog.groupId ? <GroupLabel groupId={log.opsLog.groupId} /> : '<空>';
    }
  };
}

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
    operatorIds?: string[];
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
    const window = pagination.desc
      ? [filters.dateRange[0], pagination.cursor || filters.dateRange[1]]
      : [pagination.cursor || filters.dateRange[0], filters.dateRange[1]];
    return {
      from: window[0].toISOString(),
      to: window[1].toISOString(),
      operatorIds: filters.operatorIds,
      // 多拿一个用来判断是否还有下一页
      pageSize: pageSize + 1,
      desc: pagination.desc || undefined,
    };
  }, [filters, pagination.cursor, pagination.desc]);

  const { data, isFetching } = useQuery({
    enabled: !!options,
    queryKey: ['CustomerServiceActionLogs', options],
    queryFn: () => getCustomerServiceActionLogs(options!),
    keepPreviousData: true,
  });

  const logs = useMemo(() => {
    if (pagination.desc) {
      return data?.logs.slice(0, pageSize).reverse();
    } else {
      return data?.logs.slice(0, pageSize);
    }
  }, [data, pagination.desc]);

  const handleChangeFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
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
        setPagination((prev) => ({ ...prev, hasPrevPage: data.logs.length > pageSize }));
      } else {
        setPagination((prev) => ({ ...prev, hasNextPage: data.logs.length > pageSize }));
      }
    }
  }, [data, pagination.desc]);

  const ticketById = useMemo(() => keyBy(data?.tickets, (t) => t.id), [data]);
  const userById = useMemo(() => keyBy(data?.users, (u) => u.id), [data]);

  const renderUserName = (id: string) => {
    return userById[id]?.nickname ?? '未知';
  };

  return (
    <div className="p-10">
      <div className="mb-5">
        <FilterForm initData={filters} onSubmit={handleChangeFilters} />
      </div>

      <Table
        dataSource={logs}
        rowKey={getLogId}
        pagination={false}
        loading={isFetching}
        scroll={{ x: 'max-content' }}
        columns={[
          {
            dataIndex: 'ticketId',
            title: '工单',
            render: (ticketId?: string) => {
              if (ticketId) {
                const ticket = ticketById[ticketId];
                if (ticket) {
                  return (
                    <div className="flex">
                      <TicketLink ticket={ticket} />
                    </div>
                  );
                }
              }
              return '已删除';
            },
          },
          {
            dataIndex: 'ts',
            title: '操作时间',
            render: (ts: string) => moment(ts).format('YYYY-MM-DD HH:mm:ss'),
          },
          {
            dataIndex: 'operatorId',
            title: '客服',
            render: renderUserName,
          },
          {
            key: 'action',
            title: '操作',
            render: renderAction,
          },
          {
            key: 'detail',
            title: '详情',
            render: renderDetail(renderUserName),
          },
        ]}
      />

      <div className="mt-5 text-center">
        <Button.Group>
          <Button
            disabled={!pagination.hasPrevPage || isFetching}
            onClick={() => changePage('prev')}
          >
            上一页
          </Button>
          <Button
            disabled={!pagination.hasNextPage || isFetching}
            onClick={() => changePage('next')}
          >
            下一页
          </Button>
        </Button.Group>
      </div>
    </div>
  );
}
