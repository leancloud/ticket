import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineCheck } from 'react-icons/ai';
import { TicketFormNoteSchema, useTicketFormNotes } from '@/api/ticket-form-note';
import { Button, Table } from '@/components/antd';

const { Column } = Table;

export function TicketFormNoteList() {
  // TODO: from search params
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useTicketFormNotes({ page, pageSize });

  return (
    <div className="px-10 pt-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">表单说明</h1>
      <div className="flex flex-row-reverse mb-4">
        <Link to="new">
          <Button type="primary">新增</Button>
        </Link>
      </div>

      <Table
        dataSource={data?.data}
        loading={isLoading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize,
          total: data?.totalCount,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
        }}
      >
        <Column
          key="title"
          title="名称"
          render={(note: TicketFormNoteSchema) => <Link to={note.id}>{note.name}</Link>}
        />
        <Column dataIndex="content" title="内容" ellipsis />
        <Column
          dataIndex="active"
          title="已激活"
          render={(active) => active && <AiOutlineCheck />}
        />
      </Table>
    </div>
  );
}

export * from './NewTicketFormNote';
export * from './TicketFormNoteDetail';
