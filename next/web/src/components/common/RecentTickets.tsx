import { useTickets } from '@/api/ticket';
import { TicketLink } from '@/App/Admin/components/TicketLink';
import { TicketStatus } from '@/App/Admin/components/TicketStatus';
import { Table } from '../antd';
import { DateTime } from '../DateTime';
import { Category } from './Category';
const { Column } = Table;

export const RecentTickets = ({ userId, size = 8 }: { userId: string; size?: number }) => {
  const { data: tickets, isLoading } = useTickets({
    filters: { authorId: userId },
    pageSize: size,
  });

  if (isLoading) return <>加载中</>;
  if (!tickets || tickets.length === 0) return <>无</>;
  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={tickets}
      pagination={false}
      size="middle"
      showHeader={false}
      scroll={{ x: 'max-content' }}
    >
      <Column
        dataIndex="status"
        title="状态"
        render={(status: number) => <TicketStatus status={status} />}
      />

      <Column
        key="title"
        title="标题"
        render={(ticket) => <TicketLink className="max-w-lg" ticket={ticket} />}
      />

      <Column
        dataIndex="categoryId"
        title="分类"
        render={(id: string) => (
          <Category className="whitespace-nowrap text-sm" categoryId={id} path />
        )}
      />

      <Column
        dataIndex="createdAt"
        title="创建时间"
        render={(createdAt) => <DateTime value={createdAt} className="text-gray-600" />}
      />
    </Table>
  );
};
