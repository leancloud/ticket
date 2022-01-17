import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';

import { useCategories } from '@/api/category';
import {
  CustomerServiceSchema,
  useAddCustomerService,
  useCustomerServices,
  useDeleteCustomerService,
} from '@/api/customer-service';
import { Button, Modal, Table, TableProps, message } from '@/components/antd';
import { Category, CategoryProvider, Retry, UserSelect } from '@/components/common';

function MemberActions({ id, nickname }: CustomerServiceSchema) {
  const queryClient = useQueryClient();

  const { mutate, isLoading } = useDeleteCustomerService({
    onSuccess: () => {
      message.success('移除成功');
      queryClient.invalidateQueries('customerServices');
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const handleDelete = useCallback(() => {
    Modal.confirm({
      title: '移除客服',
      content: `是否将 ${nickname} 从客服中移除？`,
      okType: 'danger',
      onOk: () => mutate(id),
    });
  }, [id, mutate]);

  return (
    <div>
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
    onError: (error) => {
      message.error(error.message);
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

function UserLabel({ nickname, avatarUrl }: CustomerServiceSchema) {
  return (
    <div className="flex items-center">
      <img className="w-4 h-4 rounded-sm" src={avatarUrl} />
      <div className="ml-1">{nickname}</div>
    </div>
  );
}

const columns: TableProps<CustomerServiceSchema>['columns'] = [
  {
    key: 'customerService',
    title: '客服',
    render: UserLabel,
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
    key: 'actions',
    title: '操作',
    render: MemberActions,
  },
];

export function Members() {
  const customerServiceResult = useCustomerServices();
  const categoriesResult = useCategories();

  const [addUserModalVisible, setAddUserModalVisible] = useState(false);

  return (
    <div className="p-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">成员</h1>

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

      <CategoryProvider categories={categoriesResult.data}>
        <Table
          className="mt-5"
          rowKey="id"
          pagination={false}
          columns={columns}
          loading={customerServiceResult.isLoading || categoriesResult.isLoading}
          dataSource={customerServiceResult.data}
        />
      </CategoryProvider>
    </div>
  );
}
