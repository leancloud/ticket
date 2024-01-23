import { useRef, useState } from 'react';
import { useToggle } from 'react-use';
import { useMutation, useQuery } from 'react-query';
import { Button, FormInstance, Modal, Table } from 'antd';
import moment from 'moment';

import { getMergeUserTasks, mergeUser } from '@/api/user';
import { MergeUserForm } from './components/MergeUserForm';

export function MergeUser() {
  const [mergeModalOpen, toggleMergeModal] = useToggle(false);
  const formRef = useRef<FormInstance>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['MergeUserTasks', page, pageSize],
    queryFn: () => getMergeUserTasks({ page, pageSize }),
  });

  const { mutate: _mergeUser, isLoading: isMerging } = useMutation({
    mutationFn: mergeUser,
    onSuccess: () => {
      toggleMergeModal(false);
      refetch();
    },
  });

  return (
    <div className="p-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">合并用户</h1>
      <div className="my-5 flex flex-row-reverse">
        <Button type="primary" onClick={toggleMergeModal}>
          合并
        </Button>
      </div>

      <Modal
        destroyOnClose
        open={mergeModalOpen}
        title="创建合并任务"
        onOk={() => formRef.current?.submit()}
        onCancel={toggleMergeModal}
        confirmLoading={isMerging}
      >
        <MergeUserForm ref={formRef} onSubmit={_mergeUser} />
      </Modal>

      <Table
        dataSource={data?.data}
        rowKey={(task) => task.id}
        loading={isLoading}
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
        columns={[
          {
            dataIndex: ['sourceUser', 'username'],
            title: '源用户',
          },
          {
            dataIndex: ['targetUser', 'username'],
            title: '目标用户',
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
              dateString ? moment(dateString).format('YYYY-MM-DD HH:mm:ss') : '-',
          },
        ]}
      />
    </div>
  );
}
