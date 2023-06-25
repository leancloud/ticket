import { Link, useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import _ from 'lodash';

import { useCustomerServices } from '@/api/customer-service';
import {
  CreateGroupData,
  GroupSchema,
  useCreateGroup,
  useDeleteGroup,
  useGroup,
  useGroups,
  useUpdateGroup,
} from '@/api/group';
import {
  Button,
  Form,
  Input,
  Modal,
  Table,
  TableProps,
  message,
  Transfer,
  Checkbox,
} from '@/components/antd';
import { QueryResult } from '@/components/common';
import { DefaultGroupPermission, GroupPermissionDescriptions } from '@/leancloud';

function GroupActions({ id, name }: GroupSchema) {
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useDeleteGroup({
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries('groups');
    },
  });

  const handleDelete = () => {
    Modal.confirm({
      title: '删除客服组',
      content: `确定删除客服组 ${name} ？`,
      onOk: () => mutate(id),
    });
  };

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
    render: (group: GroupSchema) => <GroupActions {...group} />,
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

  const { data: customerServices } = useCustomerServices();

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
            <Transfer
              dataSource={customerServices}
              titles={['客服', '成员']}
              rowKey={(user) => user.id}
              render={(user) => user.nickname}
              targetKeys={field.value}
              onChange={(targetKeys, direction, moveKeys) => {
                if (direction === 'left') {
                  field.onChange(targetKeys);
                } else {
                  field.onChange(_.difference(targetKeys, moveKeys).concat(moveKeys));
                }
              }}
              listStyle={{ width: 300, height: 400 }}
            />
          </Form.Item>
        )}
      />

      <Controller
        control={control}
        name="permissions"
        render={({ field: { value, onChange, ...field } }) => (
          <Form.Item label="权限">
            <Checkbox.Group
              options={Object.keys(DefaultGroupPermission).map((k) => ({
                label: GroupPermissionDescriptions[k as keyof typeof DefaultGroupPermission],
                value: k,
              }))}
              value={Object.entries({ ...DefaultGroupPermission, ...value })
                .filter(([, v]) => v)
                .map(([k]) => k)}
              onChange={(checked) =>
                onChange({
                  ..._.fromPairs(Object.keys(DefaultGroupPermission).map((k) => [k, false])),
                  ..._.fromPairs(checked.map((v) => [v, true])),
                })
              }
              {...field}
            />
          </Form.Item>
        )}
      />

      <Button type="primary" htmlType="submit" loading={loading}>
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

  const { mutate, isLoading } = useUpdateGroup({
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries('groups');
    },
  });

  return (
    <QueryResult className="p-10" result={groupResult}>
      {({ data }) => (
        <EditGroup initData={data} loading={isLoading} onSave={(data) => mutate([id!, data])} />
      )}
    </QueryResult>
  );
}
