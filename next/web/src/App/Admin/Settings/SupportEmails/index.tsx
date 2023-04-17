import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import cx from 'classnames';

import { Breadcrumb, Button, Modal, Table, message } from '@/components/antd';
import { LoadingCover } from '@/components/common';
import {
  SupportEmailSchema,
  useCreateSupportEmail,
  useDeleteSupportEmail,
  useSupportEmail,
  useSupportEmails,
  useUpdateSupportEmail,
} from '@/api/support-email';
import { SupportEmailForm, SupportEmailFormRef } from './SupportEmailForm';

const { Column } = Table;

export function SupportEmailList() {
  const { data: supportEmails, refetch, isLoading } = useSupportEmails();

  const { mutate: remove, isLoading: removing } = useDeleteSupportEmail({
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

      <Table
        loading={isLoading || removing}
        dataSource={supportEmails}
        rowKey="id"
        pagination={false}
      >
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

      <SupportEmailForm
        submitting={isLoading}
        onSubmit={(data) => {
          if (data.auth) {
            // make tsc happy 🙃
            mutate({ ...data, auth: data.auth });
          }
        }}
      />
    </div>
  );
}

export function EditSupportEmail() {
  const { id } = useParams() as { id: string };

  const formRef = useRef<SupportEmailFormRef>(null!);

  const { data: supportEmail, isLoading } = useSupportEmail(id);

  useEffect(() => {
    if (supportEmail) {
      formRef.current.reset(supportEmail);
    }
  }, [supportEmail]);

  const { mutate, isLoading: updating } = useUpdateSupportEmail({
    onSuccess: () => {
      message.success('已保存');
    },
  });

  return (
    <div
      className={cx('p-10 max-w-[1000px] mx-auto', {
        'h-full overflow-hidden': isLoading,
      })}
    >
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="..">支持邮箱</Link>
        </Breadcrumb.Item>
        {supportEmail && <Breadcrumb.Item>{supportEmail.email}</Breadcrumb.Item>}
      </Breadcrumb>

      {isLoading && <LoadingCover />}

      <SupportEmailForm
        ref={formRef}
        submitting={updating}
        onSubmit={(data) => mutate([id, data])}
      />
    </div>
  );
}
