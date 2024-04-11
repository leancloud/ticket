import { useMemo } from 'react';
import { compact, keyBy, uniq } from 'lodash-es';
import { ColumnType } from 'antd/lib/table';

import { useCustomerServices } from '@/api/customer-service';
import { useGroups } from '@/api/group';
import { TicketSchema } from '@/api/ticket';
import { useUsers } from '@/api/user';
import { Checkbox, Table } from '@/components/antd';
import { TicketLink } from '@/App/Admin/components/TicketLink';
import { TicketStatus } from '@/App/Admin/components/TicketStatus';
import { CategoryPath, useGetCategoryPath } from '@/App/Admin/components/CategoryPath';
import { DateTime } from '@/components/DateTime';
import { TicketLanguages } from '@/i18n/locales';
import { useTicketSwitchType } from './useTicketSwitchType';
import { useTicketFields } from '@/api/ticket-field';
import { CustomFieldGrid } from './CustomFieldGrid';

interface TicketTableColumn extends ColumnType<TicketSchema> {
  key: string;
}

export interface TicketTableProps {
  loading?: boolean;
  tickets?: TicketSchema[];
  checkedIds: string[];
  onChangeChecked: (id: string, checked: boolean) => void;
  columns?: string[];
}

export function TicketTable({
  loading,
  tickets,
  checkedIds,
  onChangeChecked,
  columns,
}: TicketTableProps) {
  const checkedIdSet = useMemo(() => new Set(checkedIds), [checkedIds]);
  const [type] = useTicketSwitchType();

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

  const DEFAULT_COLUMNS: TicketTableColumn[] = [
    {
      key: 'status',
      title: '状态',
      dataIndex: 'status',
      render: (status: number) => <TicketStatus status={status} />,
    },
    {
      key: 'title',
      title: '标题',
      render: (ticket: TicketSchema) => (
        <TicketLink
          className="max-w-lg"
          ticket={ticket}
          viewId={type === 'processable' ? 'incoming' : undefined}
        />
      ),
    },
    {
      key: 'category',
      title: '分类',
      dataIndex: 'categoryId',
      render: (categoryId: string) => (
        <CategoryPath className="whitespace-nowrap text-sm" path={getCategoryPath(categoryId)} />
      ),
    },
    {
      key: 'group',
      title: '客服组',
      dataIndex: 'groupId',
      render: (groupId?: string) => {
        if (!groupId) {
          return '--';
        }
        if (loadingGroups) {
          return 'Loading';
        }
        return groupById[groupId]?.name ?? 'unknown';
      },
    },
    {
      key: 'assignee',
      title: '负责客服',
      dataIndex: 'assigneeId',
      render: (assigneeId?: string) => {
        if (!assigneeId) {
          return '--';
        }
        if (loadingCustomerServices) {
          return 'Loading';
        }
        return CSById[assigneeId]?.nickname ?? 'unknown';
      },
    },
    {
      key: 'author',
      title: '用户',
      dataIndex: 'authorId',
      render: (authorId: string, ticket: TicketSchema) => {
        if (loadingUsers || loadingCustomerServices) {
          return 'Loading';
        }
        return (
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
        );
      },
    },
    {
      key: 'language',
      title: '工单语言',
      dataIndex: 'language',
      render: (lang = 'unknown') => TicketLanguages[lang] || '(未知)',
    },
    {
      key: 'createdAt',
      title: '创建时间',
      dataIndex: 'createdAt',
      render: (dateString: string) => <DateTime value={dateString} />,
    },
  ];

  const { data: customFields } = useTicketFields({
    pageSize: 1000,
    queryOptions: {
      staleTime: 1000 * 60 * 5,
    },
  });

  const _columns = columns
    ? compact(
        columns.map<TicketTableColumn | undefined>((id) => {
          const normal = DEFAULT_COLUMNS.find((col) => col.key === id);
          if (normal) {
            return normal;
          }
          const custom = customFields?.find((field) => field.id === id);
          if (custom) {
            return {
              key: custom.id,
              title: custom.title,
              render: (ticket: TicketSchema) => {
                const value = ticket.fields?.find((field) => field.id === id)?.value;
                return value ? <CustomFieldGrid content={value} /> : '-';
              },
            };
          }
        })
      )
    : DEFAULT_COLUMNS;

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={tickets}
      pagination={false}
      scroll={{ x: 'max-content' }}
      columns={[
        {
          dataIndex: 'id',
          fixed: 'left',
          render: (id: string) => (
            <Checkbox
              checked={checkedIdSet.has(id)}
              onChange={(e) => onChangeChecked(id, e.target.checked)}
            />
          ),
        },
        ..._columns,
      ]}
    />
  );
}
