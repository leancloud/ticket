import { Link } from 'react-router-dom';
import { Table } from 'antd';
import moment from 'moment';

import { useTickets } from '@/api/ticket';
import { TicketStatus } from '@/App/Admin/components/TicketStatus';
import { TicketLink } from '@/App/Admin/components/TicketLink';

interface RecentTicketsProps {
  userId: string;
}

export function RecentTickets({ userId }: RecentTicketsProps) {
  const { data, isLoading } = useTickets({
    pageSize: 10,
    filters: {
      authorId: userId,
    },
  });

  const hide = data?.length === 0;

  if (hide) {
    return null;
  }

  return (
    <div>
      <div className="mb-2">
        <div>
          最近工单 (
          <Link to={`/admin/tickets?authorId=${userId}&filterType=normal&tableType=all`}>
            全部工单
          </Link>
          )
        </div>
      </div>
      <Table
        loading={isLoading}
        dataSource={data}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 'max-content' }}
        columns={[
          {
            title: '标题',
            key: 'title',
            render: (ticket) => <TicketLink ticket={ticket} />,
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
              return <span title={date.format('YYYY-MM-DD HH:MM')}>{date.fromNow()}</span>;
            },
          },
        ]}
      />
    </div>
  );
}
