import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import cx from 'classnames';
import { pick } from 'lodash-es';

import {
  TicketFormSchema,
  useTicketForm,
  useTicketForms,
  useCreateTicketForm,
  useUpdateTicketForm,
  useDeleteTicketForm,
} from '@/api/ticket-form';
import { Button, Modal, Table, message } from '@/components/antd';
import { LoadingCover } from '@/components/common';
import { EditTicketForm } from './EditTicketForm';

const { Column } = Table;

function TicketFormActions({ form }: { form: TicketFormSchema }) {
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useDeleteTicketForm({
    onSuccess: () => {
      queryClient.invalidateQueries('ticketForms');
      message.success('删除成功');
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`删除失败：${error.message}`);
    },
  });

  const handleDelete = () => {
    Modal.confirm({
      title: '该操作不可恢复',
      okText: '删除',
      okButtonProps: { danger: true },
      maskClosable: true,
      onOk: () => mutate(form.id),
    });
  };

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
  // TODO: from search params
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useTicketForms({
    page,
    pageSize,
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
          <Button type="primary">新增表单</Button>
        </Link>
      </div>

      <Table
        dataSource={data?.items}
        loading={isLoading}
        rowKey="id"
        pagination={{
          total: data?.totalCount,
          current: page,
          pageSize,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
        }}
      >
        <Column
          title="标题"
          dataIndex="title"
          render={(title, form: TicketFormSchema) => <Link to={form.id}>{title}</Link>}
        />
        <Column
          title="字段数量"
          key="fieldCount"
          render={(form: TicketFormSchema) => form.fieldIds.length}
        />
        <Column
          title="操作"
          key="actions"
          render={(form: TicketFormSchema) => <TicketFormActions form={form} />}
        />
      </Table>
    </div>
  );
}

export function NewTicketForm() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate, isLoading } = useCreateTicketForm({
    onSuccess: (data) => {
      message.success('创建成功');
      queryClient.invalidateQueries('ticketForms');
      navigate(`../${data.id}`);
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`创建失败：${error.message}`);
    },
  });

  return (
    <EditTicketForm submitting={isLoading} onSubmit={mutate} onCancel={() => navigate('..')} />
  );
}

export function TicketFormDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data, isLoading } = useTicketForm(id!, {
    staleTime: 1000 * 60 * 5,
  });

  const queryClient = useQueryClient();
  const { mutate, isLoading: isUpdating } = useUpdateTicketForm({
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries('ticketForms');
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`更新失败：${error.message}`);
    },
  });

  const formData = useMemo(() => pick(data, ['title', 'items']), [data]);

  if (isLoading) {
    return <LoadingCover />;
  }
  return (
    <EditTicketForm
      data={formData}
      submitting={isUpdating}
      onSubmit={(data) => mutate([id!, data])}
      onCancel={() => navigate('..')}
    />
  );
}
