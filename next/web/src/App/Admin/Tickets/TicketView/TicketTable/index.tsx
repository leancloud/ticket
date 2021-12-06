import { memo, createContext, useMemo, useCallback, useContext } from 'react';
import moment from 'moment';
import { noop } from 'lodash-es';

import { GroupSchema } from '@/api/group';
import { TicketSchema } from '@/api/ticket';
import { UserSchema } from '@/api/user';
import { Checkbox, Table } from '@/components/antd';
import Status from '../TicketStatus';
import { CategoryPath, useGetCategoryPath } from '../TicketList';

const { Column } = Table;

const CheckedContext = createContext({
  getChecked: (() => false) as (id: string) => boolean,
  setChecked: noop as (id: string, checked: boolean) => void,
});

function TicketCheckbox({ id }: { id: string }) {
  const { getChecked, setChecked } = useContext(CheckedContext);
  return <Checkbox checked={getChecked(id)} onChange={(e) => setChecked(id, e.target.checked)} />;
}

function TicketLink({ ticket }: { ticket: TicketSchema }) {
  return (
    <a
      className="flex mt-1.5 font-semibold max-w-full"
      title={ticket.title}
      href={`/tickets/${ticket.nid}`}
    >
      <span className="flex-shrink truncate">{ticket.title}</span>
      <span className="flex-shrink-0 ml-1 text-[#6f7c87]">#{ticket.nid}</span>
    </a>
  );
}

export interface TicketTableProps {
  tickets: TicketSchema[];
  checkedIds: string[];
  onChangeChecked: (id: string, checked: boolean) => void;
}

export const TicketTable = memo(({ tickets, checkedIds, onChangeChecked }: TicketTableProps) => {
  const checkedIdSet = useMemo(() => new Set(checkedIds), [checkedIds]);
  const getCategoryPath = useGetCategoryPath();

  return (
    <Table className="min-w-[1000px]" dataSource={tickets} pagination={false}>
      <Column
        className="w-0"
        dataIndex="id"
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
        render={(status: number) => <Status status={status} />}
      />
      <Column
        dataIndex="title"
        title="标题"
        render={(title: string, ticket: TicketSchema) => <TicketLink ticket={ticket} />}
      />
      <Column
        dataIndex="categoryId"
        title="分类"
        render={(id: string) => (
          <CategoryPath className="whitespace-nowrap" path={getCategoryPath(id)} />
        )}
      />
      <Column dataIndex={['author', 'nickname']} title="创建人" />
      <Column dataIndex="group" title="组" render={(group?: GroupSchema) => group?.name ?? '--'} />
      <Column
        dataIndex="assignee"
        title="客服"
        render={(assignee?: UserSchema) => assignee?.nickname ?? '--'}
      />
      <Column
        title="创建时间"
        dataIndex="createdAt"
        render={(data: string) => (
          <span title={new Date(data).toLocaleString()}>{moment(data).fromNow()}</span>
        )}
      />
    </Table>
  );
});
