import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';

import {
  CustomerServiceSchema,
  useAddCustomerService,
  useCustomerServices,
  useDeleteCustomerService,
  useUpdateCustomerService,
} from '@/api/customer-service';
import { Button, Modal, Table, TableProps, message } from '@/components/antd';
import { Category, Retry, UserSelect } from '@/components/common';
import { UserLabel } from '@/App/Admin/components';

function MemberActions({ id, nickname, active }: CustomerServiceSchema) {
  const queryClient = useQueryClient();

  const { mutate: update, isLoading: isUpdating } = useUpdateCustomerService({
    onSuccess: () => {
      message.success(`${active ? '禁用' : '启用'}成功`);
      queryClient.invalidateQueries('customerServices');
    },
  });

  const { mutate, isLoading } = useDeleteCustomerService({
    onSuccess: () => {
      message.success('移除成功');
      queryClient.invalidateQueries('customerServices');
    },
  });

  const handleToggleActive = useCallback(() => {
    Modal.confirm({
      title: `${active ? '禁用' : '启用'}客服`,
      content: `是否将 ${nickname} ${active ? '禁用' : '启用'}`,
      okType: 'danger',
      onOk: () => update({ id, active: !active }),
    });
  }, [update, id, active, nickname]);

  const handleDelete = useCallback(() => {
    Modal.confirm({
      title: '移除客服',
      content: `是否将 ${nickname} 从客服中移除？移除可能会导致用户相关数据丢失`,
      okType: 'danger',
      onOk: () => mutate(id),
    });
  }, [id, mutate, nickname]);

  return (
    <div>
      <Button type="link" size="small" disabled={isUpdating} onClick={handleToggleActive}>
        {active ? '禁用' : '启用'}
      </Button>
      <Button danger type="link" size="small" disabled={isLoading} onClick={handleDelete}>
        移除
      </Button>
    </div>
  );
}

interface AddUserModalProps {
  visible: boolean;
  onHide: () => void;
}

function AddUserModal({ visible, onHide }: AddUserModalProps) {
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    setUserId(undefined);
  }, [visible]);

  const queryClient = useQueryClient();
  const { mutate, isLoading } = useAddCustomerService({
    onSuccess: () => {
      message.success('添加成功');
      queryClient.invalidateQueries('customerServices');
      onHide();
    },
  });

  const handleAdd = useCallback(() => {
    mutate(userId!);
  }, [userId, mutate]);

  return (
    <Modal
      visible={visible}
      title="添加客服"
      onOk={handleAdd}
      confirmLoading={isLoading}
      okButtonProps={{ disabled: isLoading || !userId }}
      onCancel={() => onHide()}
      cancelButtonProps={{ disabled: isLoading }}
    >
      <UserSelect className="w-full" autoFocus value={userId} onChange={setUserId as any} />
    </Modal>
  );
}

const columns: TableProps<CustomerServiceSchema>['columns'] = [
  {
    key: 'customerService',
    title: '客服',
    render: (user) => <UserLabel user={user} />,
  },
  {
    dataIndex: 'categoryIds',
    title: '负责分类',
    render: (categoryIds: string[]) => (
      <div className="flex flex-wrap gap-1.5">
        {categoryIds.length === 0 && '-'}
        {categoryIds.map((categoryId) => (
          <Category key={categoryId} className="text-sm py-0.5" categoryId={categoryId} path />
        ))}
      </div>
    ),
  },
  {
    dataIndex: 'active',
    title: '状态',
    render: (active: boolean) => (active ? '启用中' : '禁用中'),
  },
  {
    key: 'actions',
    title: '操作',
    render: MemberActions,
  },
];

export function Members() {
  const customerServiceResult = useCustomerServices();

  const [addUserModalVisible, setAddUserModalVisible] = useState(false);

  return (
    <div className="p-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">客服</h1>

      <div className="flex flex-row-reverse">
        <Button type="primary" onClick={() => setAddUserModalVisible(true)}>
          添加
        </Button>
      </div>

      <AddUserModal visible={addUserModalVisible} onHide={() => setAddUserModalVisible(false)} />

      {customerServiceResult.error && (
        <Retry
          message="获取客服失败"
          error={customerServiceResult.error}
          onRetry={customerServiceResult.refetch}
        />
      )}

      <Table
        className="mt-5"
        rowKey="id"
        pagination={false}
        columns={columns}
        loading={customerServiceResult.isLoading}
        dataSource={customerServiceResult.data}
      />
    </div>
  );
}
