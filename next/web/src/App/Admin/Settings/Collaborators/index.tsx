import { useEffect, useState } from 'react';
import { useToggle } from 'react-use';

import { UserSchema } from '@/api/user';
import { useCollaborators, useCreateCollaborator, useDeleteCollaborator } from '@/api/collaborator';
import { Button, Modal, Table, Typography } from '@/components/antd';
import { UserSelect } from '@/components/common';
import { UserLabel } from '@/App/Admin/components';

const { Column } = Table;
const { Title, Paragraph } = Typography;

interface AddCollaboratorModalProps {
  open: boolean;
  onAdd: (userId: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

function AddCollaboratorModal({ open, onAdd, onCancel, loading }: AddCollaboratorModalProps) {
  const [userId, setUserId] = useState<string>();

  useEffect(() => {
    if (!open) {
      setUserId(undefined);
    }
  }, [open]);

  return (
    <Modal
      destroyOnClose
      visible={open}
      title="添加协作者"
      okButtonProps={{ disabled: !userId, loading }}
      cancelButtonProps={{ disabled: loading }}
      onOk={() => onAdd(userId!)}
      onCancel={onCancel}
    >
      <UserSelect
        autoFocus
        className="w-full"
        value={userId}
        onChange={(userId) => setUserId(userId as string)}
      />
    </Modal>
  );
}

export function Collaborators() {
  const { data, isFetching, refetch } = useCollaborators();

  const [addModalOpen, toggleAddModal] = useToggle(false);

  const { mutate: create, isLoading: isCreating } = useCreateCollaborator({
    onSuccess: () => {
      refetch();
      toggleAddModal(false);
    },
  });

  const { mutateAsync: remove } = useDeleteCollaborator({
    onSuccess: () => {
      refetch();
    },
  });

  const handleRemove = (user: UserSchema) => {
    Modal.confirm({
      title: `移除协作者`,
      content: `将 ${user.nickname} 从协作者中移除`,
      onOk: () => remove(user.id),
    });
  };

  return (
    <div className="p-10">
      <Typography>
        <Title level={2}>协作者</Title>
        <Paragraph>协作者可以：</Paragraph>
        <ul>
          <li>查看分配给其的工单</li>
          <li>创建内部回复</li>
        </ul>
      </Typography>

      <div className="flex justify-end mb-5">
        <Button type="primary" onClick={toggleAddModal}>
          添加
        </Button>
      </div>

      <Table dataSource={data} rowKey="id" pagination={false} loading={isFetching}>
        <Column key="id" title="协作者" render={(user) => <UserLabel user={user} />} />
        <Table.Column key="email" title="邮箱" render={(user) => user.email || '-'} />
        <Column
          key="actions"
          title="操作"
          render={(user) => (
            <Button danger type="link" size="small" onClick={() => handleRemove(user)}>
              移除
            </Button>
          )}
        />
      </Table>

      <AddCollaboratorModal
        open={addModalOpen}
        loading={isCreating}
        onAdd={create}
        onCancel={toggleAddModal}
      />
    </div>
  );
}
