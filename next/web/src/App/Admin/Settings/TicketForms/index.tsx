import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import { difference } from 'lodash-es';
import cx from 'classnames';

import {
  TicketFormSchema,
  UpdateTicketFormData,
  createTicketForm,
  updateTicketForm,
  useTicketForm,
  useTicketForms,
  deleteTicketForm,
} from '@/api/ticket-form';
import { Button, Modal, Spin, Table, message } from '@/components/antd';
import { usePage, usePageSize } from '@/utils/usePage';
import { EditTicketForm, systemFieldIds } from './EditTicketForm';

const { Column } = Table;

function TicketFormActions({ form }: { form: TicketFormSchema }) {
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation({
    mutationFn: deleteTicketForm,
    onSuccess: () => {
      queryClient.invalidateQueries('ticketForms');
      message.success('删除成功');
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`删除失败：${error.message}`);
    },
  });

  const handleDelete = useCallback(() => {
    Modal.confirm({
      title: '该操作不可恢复',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      maskClosable: true,
      onOk: () => mutate(form.id),
    });
  }, [form.id, mutate]);

  return (
    <button
      className={cx('text-[#ff4d4f]', {
        'text-gray-300': isLoading,
      })}
      disabled={isLoading}
      onClick={handleDelete}
    >
      删除
    </button>
  );
}

export function TicketFormList() {
  const [page, { set: setPage }] = usePage();
  const [pageSize = 20, setPageSize] = usePageSize();
  const { data, totalCount, isLoading } = useTicketForms({
    page,
    pageSize,
    orderBy: 'updatedAt-desc',
    count: 1,
    queryOptions: {
      keepPreviousData: true,
      staleTime: 1000 * 60,
    },
  });

  return (
    <div className="px-10 pt-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">工单表单</h1>
      <div className="flex flex-row-reverse mb-4">
        <Link to="new">
          <Button type="primary" ghost>
            新增表单
          </Button>
        </Link>
      </div>

      {isLoading && <div className="h-80 my-40 text-center" children={<Spin />} />}

      {data && (
        <Table
          dataSource={data}
          rowKey="id"
          pagination={{
            pageSize,
            onShowSizeChange: (page, size) => {
              setPage(page);
              setPageSize(size);
            },
            current: page,
            onChange: setPage,
            total: totalCount,
          }}
        >
          <Column
            title="标题"
            dataIndex="title"
            render={(title, form: TicketFormSchema) => <Link to={form.id}>{title}</Link>}
          />
          <Column
            title="修改日期"
            dataIndex="updatedAt"
            render={(value) => new Date(value).toLocaleString()}
          />
          <Column
            title="操作"
            key="actions"
            render={(_, form: TicketFormSchema) => <TicketFormActions form={form} />}
          />
        </Table>
      )}
    </div>
  );
}

export function NewTicketForm() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { mutate, isLoading } = useMutation({
    mutationFn: createTicketForm,
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries('ticketForms');
      navigate('..');
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`创建失败：${error.message}`);
    },
  });

  return (
    <EditTicketForm
      initData={{
        title: '',
        fieldIds: [],
      }}
      submitting={isLoading}
      onSubmit={mutate}
      onCancel={() => navigate('..')}
    />
  );
}

export function TicketFormDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data, isLoading } = useTicketForm(id!, {
    staleTime: 1000 * 60 * 5,
  });

  const queryClient = useQueryClient();
  const { mutate, isLoading: isUpdating } = useMutation({
    mutationFn: (data: UpdateTicketFormData) => updateTicketForm(id!, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries('ticketForms');
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`更新失败：${error.message}`);
    },
  });

  if (isLoading) {
    return <div className="h-80 my-40 text-center" children={<Spin />} />;
  }
  return (
    <EditTicketForm
      initData={data}
      submitting={isUpdating}
      onSubmit={mutate}
      onCancel={() => navigate('..')}
    />
  );
}
