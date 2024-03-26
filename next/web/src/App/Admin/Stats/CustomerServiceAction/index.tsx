import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useToggle } from 'react-use';
import { Button, Table, Tooltip } from 'antd';
import moment, { Moment } from 'moment';
import { keyBy } from 'lodash-es';

import { TicketLanguages } from '@/i18n/locales';
import { useGroups } from '@/api/group';
import {
  CustomerServiceActionLog as Log,
  GetCustomerServiceActionLogsOptions,
  getCustomerServiceActionLogs,
} from '@/api/customer-service-action-log';
import { TicketLink } from '@/App/Admin/components/TicketLink';
import { DiffFields } from '@/App/Admin/Tickets/Ticket/components/OpsLog';
import { SimpleModal } from './components/SimpleModal';
import { FilterForm, FilterFormData } from './components/FilterForm';
import { useCategoryContext } from '@/components/common';
import { Exporter } from './components/Exporter';
import { renderAction } from './render';

function renderDetail(
  getUserName: (id: string) => string,
  getGroupName: (id: string) => string,
  getCategoryName: (id: string) => string
) {
  return (log: Log) => {
    if (log.type === 'reply') {
      const content = log.reply?.content ?? log.revision?.content;
      return (
        <Tooltip title={content} placement="left">
          <div className="max-w-[400px] truncate">{content}</div>
        </Tooltip>
      );
    }
    switch (log.opsLog.action) {
      case 'changeAssignee':
        return log.opsLog.assigneeId ? getUserName(log.opsLog.assigneeId) : '<空>';
      case 'changeCategory':
        return getCategoryName(log.opsLog.categoryId);
      case 'changeFields':
        return (
          <SimpleModal title="字段修改记录" trigger={<a>查看</a>} footer={null}>
            <DiffFields changes={log.opsLog.changes} />
          </SimpleModal>
        );
      case 'changeGroup':
        return log.opsLog.groupId ? getGroupName(log.opsLog.groupId) : '<空>';
    }
  };
}

const pageSize = 20;

export function CustomerServiceAction() {
  const [filters, setFilters] = useState<FilterFormData>(() => ({
    dateRange: [moment().startOf('day'), moment().endOf('day')],
  }));

  const [pagination, setPagination] = useState<{
    cursor?: Moment;
    desc?: boolean;
    hasPrevPage?: boolean;
    hasNextPage?: boolean;
    exclude?: string[];
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
      exclude: pagination.exclude,
    };
  }, [filters, pagination.cursor, pagination.desc, pagination.exclude]);

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
      const cursor = moment(logs[0].ts);
      setPagination({
        cursor,
        desc: true,
        hasNextPage: true,
        exclude: logs.filter((log) => moment(log.ts).isSame(cursor)).map((log) => log.id),
      });
    } else {
      const cursor = moment(logs[logs.length - 1].ts);
      setPagination({
        cursor,
        hasPrevPage: true,
        exclude: logs.filter((log) => moment(log.ts).isSame(cursor)).map((log) => log.id),
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

  const [ticketById, userById] = useMemo(() => {
    return [keyBy(data?.tickets, (t) => t.id), keyBy(data?.users, (t) => t.id)];
  }, [data]);

  const getUserName = (id: string) => {
    return userById[id]?.nickname ?? '未知';
  };

  const { data: groups } = useGroups();
  const getGroupName = useMemo(() => {
    const groupById = keyBy(groups, (g) => g.id);
    return (id: string) => groupById[id]?.name ?? '未知';
  }, [groups]);

  const { getCategoryPath } = useCategoryContext();
  const getCategoryName = (id: string) => {
    return getCategoryPath(id)
      .map((c) => c.name)
      .join(' / ');
  };

  const [exporterOpen, toggleExporter] = useToggle(false);

  return (
    <div className="p-10">
      <div className="mb-5 flex items-end gap-2">
        <FilterForm initData={filters} onSubmit={handleChangeFilters} />
        <Button disabled={!logs?.length} onClick={toggleExporter}>
          导出
        </Button>
      </div>

      <Table
        dataSource={logs}
        rowKey={(log) => log.id}
        pagination={false}
        loading={isFetching}
        scroll={{ x: 'max-content' }}
        columns={[
          {
            dataIndex: 'ticketId',
            title: '工单',
            render: (ticketId?: string) => {
              const ticket = ticketId && ticketById[ticketId];
              if (ticket) {
                return <TicketLink className="max-w-[400px]" ticket={ticket} />;
              }
            },
          },
          {
            key: 'userId',
            title: '用户ID',
            render: (log: Log) => {
              if (log.ticketId) {
                const ticket = ticketById[log.ticketId];
                if (ticket) {
                  return ticket.authorId;
                }
              }
            },
          },
          {
            key: 'language',
            title: '工单语言',
            render: (log: Log) => {
              if (log.ticketId) {
                const ticket = ticketById[log.ticketId];
                if (ticket && ticket.language) {
                  return TicketLanguages[ticket.language];
                }
              }
            },
          },
          {
            key: 'category',
            title: '工单分类',
            render: (log: Log) => {
              if (log.ticketId) {
                const ticket = ticketById[log.ticketId];
                if (ticket && ticket.categoryId) {
                  return getCategoryName(ticket.categoryId);
                }
              }
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
            render: getUserName,
          },
          {
            key: 'action',
            title: '操作',
            render: renderAction,
          },
          {
            key: 'detail',
            title: '详情',
            render: renderDetail(getUserName, getGroupName, getCategoryName),
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

      <Exporter open={exporterOpen} onCancel={toggleExporter} filters={filters} />
    </div>
  );
}
