import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';

import {
  CreateGroupData,
  GroupSchema,
  UpdateGroupData,
  useCreateGroup,
  useDeleteGroup,
  useGroup,
  useGroups,
  useUpdateGroup,
} from '@/api/group';
import { Button, Form, Input, Modal, Table, TableProps, message } from '@/components/antd';
import { CustomerServiceSelect, QueryResult } from '@/components/common';

function GroupActions({ id, name }: GroupSchema) {
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useDeleteGroup({
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries('groups');
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const handleDelete = useCallback(() => {
    Modal.confirm({
      title: '删除客服组',
      content: `确定删除客服组 ${name} ？`,
      onOk: () => mutate(id),
    });
  }, [id, mutate]);

  return (
    <div>
      <Button danger type="link" size="small" disabled={isLoading} onClick={handleDelete}>
        删除
      </Button>
    </div>
  );
}

const columns: TableProps<GroupSchema>['columns'] = [
  {
    dataIndex: 'name',
    title: '名称',
    className: 'whitespace-nowrap',
    render: (name: string, group: GroupSchema) => <Link to={group.id} children={name} />,
  },
  {
    dataIndex: 'description',
    title: '描述',
    render: (desc: string) => desc || '-',
  },
  {
    key: 'actions',
    title: '操作',
    render: GroupActions,
  },
];

export function GroupList() {
  const { data: groups, isLoading } = useGroups();

  return (
    <div className="p-10">
      <h1 className="text-[#2f3941] text-[26px] font-normal">客服组</h1>

      <div className="flex flex-row-reverse">
        <Link to="new">
          <Button type="primary" children="新增客服组" />
        </Link>
      </div>

      <Table
        className="mt-5"
        columns={columns}
        loading={isLoading}
        dataSource={groups}
        rowKey="id"
        pagination={false}
      />
    </div>
  );
}

interface EditGroupProps {
  initData?: CreateGroupData;
  loading?: boolean;
  onSave: (data: CreateGroupData) => void;
}

function EditGroup({ initData, loading, onSave }: EditGroupProps) {
  const { control, handleSubmit } = useForm({
    defaultValues: initData,
  });

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSave)}>
      <Controller
        control={control}
        name="name"
        rules={{ required: '请填写此字段' }}
        render={({ field, fieldState: { error } }) => (
          <Form.Item
            label="名称"
            validateStatus={error ? 'error' : undefined}
            help={error?.message}
          >
            <Input {...field} autoFocus />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <Form.Item label="描述">
            <Input.TextArea {...field} />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="userIds"
        render={({ field }) => (
          <Form.Item label="成员">
            <CustomerServiceSelect {...field} mode="multiple" />
          </Form.Item>
        )}
      />

      <Button type="primary" htmlType="submit" disabled={loading}>
        保存
      </Button>
    </Form>
  );
}

export function NewGroup() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate, isLoading } = useCreateGroup({
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries('groups');
      navigate('..');
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  return (
    <div className="p-10">
      <EditGroup loading={isLoading} onSave={mutate} />
    </div>
  );
}

export function GroupDetail() {
  const { id } = useParams<'id'>();
  const groupResult = useGroup(id!);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate, isLoading } = useUpdateGroup({
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries('groups');
      navigate('..');
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  const handleUpdate = useCallback(
    (data: UpdateGroupData) => {
      mutate([id!, data]);
    },
    [id, mutate]
  );

  return (
    <QueryResult className="p-10" result={groupResult}>
      {({ data }) => <EditGroup initData={data} loading={isLoading} onSave={handleUpdate} />}
    </QueryResult>
  );
}
