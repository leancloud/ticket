import { useCallback } from 'react';
import { useQueryClient } from 'react-query';

import { useCategories } from '@/api/category';
import {
  CustomerServiceSchema,
  useAddCustomerService,
  useCustomerServices,
  useDeleteCustomerService,
} from '@/api/customer-service';
import { Button, Modal, Table, TableProps, message } from '@/components/antd';
import { Category, CategoryProvider, Retry } from '@/components/common';

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

const columns: TableProps<CustomerServiceSchema>['columns'] = [
  {
    key: 'customerService',
    title: '客服',
    render: (user: CustomerServiceSchema) => user.nickname,
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

  return (
    <div className="p-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">成员</h1>

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
