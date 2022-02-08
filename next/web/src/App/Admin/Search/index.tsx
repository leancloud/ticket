import { useState } from 'react';

import { useSearchTicketCustomField } from '@/api/ticket';
import { Input, Table } from '@/components/antd';

const { Search } = Input;
const { Column } = Table;

export function SearchTicket() {
  const [keyword, setKeyword] = useState('');

  const { data, isLoading } = useSearchTicketCustomField(keyword, {
    enabled: !!keyword,
  });

  return (
    <div className="bg-white h-full p-10 overflow-auto">
      <Search
        size="large"
        placeholder="根据自定义字段搜索工单"
        onSearch={(value) => setKeyword(value.trim())}
      />

      {keyword && (
        <Table
          className="mt-5"
          rowKey="id"
          loading={isLoading}
          dataSource={data}
          pagination={false}
        >
          <Column
            key="title"
            title="标题"
            render={({ nid, title }) => <a href={`/tickets/${nid}`}>{title}</a>}
          />
          <Column
            dataIndex="createdAt"
            title="创建时间"
            render={(date) => new Date(date).toLocaleString()}
          />
        </Table>
      )}
    </div>
  );
}
