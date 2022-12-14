import { useMemo } from 'react';
import { keyBy, uniq } from 'lodash-es';
import { useCustomerServices } from '@/api/customer-service';
import { useGroups } from '@/api/group';
import { TicketSchema } from '@/api/ticket';
import { useUsers } from '@/api/user';
import { Checkbox, Table } from '@/components/antd';
import { TicketStatus } from '../../../components/TicketStatus';
import { CategoryPath, useGetCategoryPath } from '@/App/Admin/components/CategoryPath';
import { DateTime } from '@/components/DateTime';
import { TicketLink } from '../../../components/TicketLink';

const { Column } = Table;

export interface TicketTableProps {
  loading?: boolean;
  tickets?: TicketSchema[];
  checkedIds: string[];
  onChangeChecked: (id: string, checked: boolean) => void;
}

export function TicketTable({ loading, tickets, checkedIds, onChangeChecked }: TicketTableProps) {
  const checkedIdSet = useMemo(() => new Set(checkedIds), [checkedIds]);

  const userIds = useMemo(() => (tickets ? uniq(tickets.map((t) => t.authorId)) : []), [tickets]);
  const { data: users, isLoading: loadingUsers } = useUsers({
    id: userIds,
    queryOptions: {
      enabled: userIds.length > 0,
      staleTime: 1000 * 60,
    },
  });
  const userById = useMemo(() => keyBy(users, 'id'), [users]);

  const getCategoryPath = useGetCategoryPath();

  const { data: groups, isLoading: loadingGroups } = useGroups();
  const groupById = useMemo(() => keyBy(groups, 'id'), [groups]);

  const { data: customerServices, isLoading: loadingCustomerServices } = useCustomerServices();
  const CSById = useMemo(() => keyBy(customerServices, 'id'), [customerServices]);

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={tickets}
      pagination={false}
      scroll={{ x: 'max-content' }}
    >
      <Column
        dataIndex="id"
        fixed="left"
        render={(id: string) => (
          <Checkbox
            checked={checkedIdSet.has(id)}
            onChange={(e) => onChangeChecked(id, e.target.checked)}
          />
        )}
      />

      <Column
        dataIndex="status"
        title="状态"
        render={(status: number) => <TicketStatus status={status} />}
      />

      <Column
        key="title"
        title="标题"
        render={(ticket: TicketSchema) => (
          <TicketLink ticket={ticket} className="inline-block max-w-lg" />
        )}
      />

      <Column
        dataIndex="categoryId"
        title="分类"
        render={(id: string) => (
          <CategoryPath className="whitespace-nowrap text-sm" path={getCategoryPath(id)} />
        )}
      />

      <Column
        dataIndex="groupId"
        title="客服组"
        render={(groupId?: string) =>
          groupId ? (loadingGroups ? 'Loading...' : groupById[groupId]?.name ?? 'unknown') : '--'
        }
      />

      <Column
        dataIndex="assigneeId"
        title="负责客服"
        render={(assigneeId?: string) =>
          assigneeId
            ? loadingCustomerServices
              ? 'Loading...'
              : CSById[assigneeId]?.nickname ?? 'unknown'
            : '--'
        }
      />

      <Column
        dataIndex="authorId"
        title="用户"
        render={(authorId: string, ticket: TicketSchema) =>
          loadingUsers || loadingCustomerServices ? (
            'Loading'
          ) : (
            <>
              {userById[authorId]?.nickname ?? 'unknown'}
              {ticket.reporterId !== undefined && (
                <>
                  <br />
                  <span className="text-sm">
                    <span className="text-gray-400">via</span> {CSById[ticket.reporterId]?.nickname}
                  </span>
                </>
              )}
            </>
          )
        }
      />

      <Column
        title="创建时间"
        dataIndex="createdAt"
        render={(data: string) => <DateTime value={data} />}
      />
    </Table>
  );
}
