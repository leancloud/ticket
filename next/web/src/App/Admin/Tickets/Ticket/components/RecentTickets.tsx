import { useState } from 'react';
import { useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { AiFillCaretLeft, AiFillCaretRight } from 'react-icons/ai';
import { Button, Table } from 'antd';
import moment from 'moment';

import { useAssociatedTickets, useAssociateTickets, useTickets } from '@/api/ticket';
import { TicketStatus } from '@/App/Admin/components/TicketStatus';
import { TicketLink } from '@/App/Admin/components/TicketLink';

interface RecentTicketsProps {
  className?: string;
  ticketId: string;
  userId: string;
}

export function RecentTickets({ className, ticketId, userId }: RecentTicketsProps) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { data, isFetching } = useTickets({
    page,
    pageSize,
    filters: {
      authorId: userId,
    },
    queryOptions: {
      keepPreviousData: true,
      staleTime: 1000 * 60,
    },
  });

  const queryClient = useQueryClient();

  const { data: associatedTickets } = useAssociatedTickets(ticketId);
  const canAssicoate = (id: string) => {
    if (!associatedTickets) {
      return false;
    }
    return associatedTickets.findIndex((ticket) => ticket.id === id) === -1;
  };

  const associate = useAssociateTickets({
    onSuccess: () => {
      queryClient.invalidateQueries(['AssociatedTickets', ticketId]);
    },
  });

  const noData = data && data.length === 0;
  const noMoreData = data && data.length < pageSize;

  if (noData && page === 1) {
    return null;
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center">
        <div>
          最近工单 (
          <Link to={`/admin/tickets?authorId=${userId}&filterType=normal&tableType=all`}>
            全部工单
          </Link>
          )
        </div>
        <div className="ml-auto">
          <Button
            type="text"
            size="small"
            disabled={isFetching || page === 1}
            onClick={() => setPage(page - 1)}
          >
            <AiFillCaretLeft />
          </Button>
          <Button
            type="text"
            size="small"
            disabled={isFetching || noMoreData}
            onClick={() => setPage(page + 1)}
          >
            <AiFillCaretRight />
          </Button>
        </div>
      </div>
      <Table
        loading={isFetching}
        dataSource={data}
        rowKey="id"
        size="middle"
        pagination={false}
        scroll={{ x: 'max-content' }}
        columns={[
          {
            title: '标题',
            key: 'title',
            render: (ticket) => <TicketLink className="max-w-sm" ticket={ticket} />,
          },
          {
            title: '状态',
            dataIndex: 'status',
            render: (status) => <TicketStatus status={status} />,
          },
          {
            title: '创建时间',
            dataIndex: 'createdAt',
            render: (createdAt) => {
              const date = moment(createdAt);
              return <span title={date.format('YYYY-MM-DD HH:mm')}>{date.fromNow()}</span>;
            },
          },
          {
            title: '操作',
            key: 'actions',
            render: (ticket) => (
              <div className="-my-1">
                <Button
                  size="small"
                  disabled={
                    ticketId === ticket.id || !canAssicoate(ticket.id) || associate.isLoading
                  }
                  onClick={() => associate.mutate([ticketId, ticket.id])}
                >
                  关联
                </Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
