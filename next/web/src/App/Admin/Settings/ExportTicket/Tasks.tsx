import { useState } from 'react';
import { useQuery } from 'react-query';
import { Table } from 'antd';
import moment from 'moment';

import { getExportTicketTasks } from '@/api/ticket';

export function ExportTicketTask() {
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });

  const { data, isLoading } = useQuery({
    queryKey: ['ExportTicketTasks', pagination],
    queryFn: () => getExportTicketTasks(pagination),
  });

  return (
    <div className="p-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal mb-5">导出记录</h1>

      <Table
        dataSource={data?.data}
        rowKey={(task) => task.id}
        loading={isLoading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: data?.totalCount,
          showSizeChanger: true,
          onChange: (page, pageSize) => setPagination({ page, pageSize }),
        }}
        columns={[
          {
            dataIndex: 'id',
            title: 'ID',
          },
          {
            dataIndex: ['operator', 'nickname'],
            title: '导出人',
          },
          {
            dataIndex: 'status',
            title: '状态',
          },
          {
            dataIndex: 'createdAt',
            title: '开始时间',
            render: (dateString: string) => moment(dateString).format('YYYY-MM-DD HH:mm:ss'),
          },
          {
            dataIndex: 'completedAt',
            title: '完成时间',
            render: (dateString?: string) =>
              dateString && moment(dateString).format('YYYY-MM-DD HH:mm:ss'),
          },
          {
            dataIndex: 'ticketCount',
            title: '工单数量',
          },
          {
            dataIndex: 'downloadUrl',
            title: '下载链接',
            render: (url?: string) =>
              url && (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  下载
                </a>
              ),
          },
        ]}
      />
    </div>
  );
}
