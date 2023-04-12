import { Link, useNavigate } from 'react-router-dom';

import { Breadcrumb, Button, Modal, Table, message } from '@/components/antd';
import {
  SupportEmailSchema,
  useCreateSupportEmail,
  useDeleteSupportEmail,
  useSupportEmails,
} from '@/api/support-email';
import { SupportEmailForm } from './SupportEmailForm';

const { Column } = Table;

export function SupportEmailList() {
  const { data: supportEmails, refetch } = useSupportEmails();

  const { mutate: remove } = useDeleteSupportEmail({
    onSuccess: () => {
      refetch();
    },
  });

  const handleDelete = (supportEmail: SupportEmailSchema) => {
    Modal.confirm({
      title: '删除支持邮箱',
      content: `${supportEmail.email} 将被永久删除`,
      okType: 'danger',
      onOk: () => remove(supportEmail.id),
    });
  };

  return (
    <div className="p-10 max-w-[1000px] mx-auto">
      <h1 className="text-[#2f3941] text-[26px] font-normal">支持邮箱</h1>
      <p>用户可通过向支持邮箱发送邮件的方式创建工单</p>

      <div className="flex flex-row-reverse mb-4">
        <Link to="new">
          <Button type="primary">添加地址</Button>
        </Link>
      </div>

      <Table dataSource={supportEmails} rowKey="id" pagination={false}>
        <Column dataIndex="email" title="地址" />
        <Column dataIndex="name" title="名称" />
        <Column
          key="actions"
          title="操作"
          render={(supportEmail: SupportEmailSchema) => (
            <div className="space-x-2">
              <Link to={supportEmail.id}>编辑</Link>
              <a
                className="text-red-500 hover:text-red-400"
                onClick={() => handleDelete(supportEmail)}
              >
                删除
              </a>
            </div>
          )}
        />
      </Table>
    </div>
  );
}

export function NewSupportEmail() {
  const navigate = useNavigate();

  const { mutate, isLoading } = useCreateSupportEmail({
    onSuccess: (supportEmail) => {
      message.success('创建成功');
      navigate(`../${supportEmail.id}`);
    },
  });

  return (
    <div className="p-10 max-w-[1000px] mx-auto">
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="..">支持邮箱</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>添加</Breadcrumb.Item>
      </Breadcrumb>

      <SupportEmailForm submitting={isLoading} onSubmit={mutate} />
    </div>
  );
}
