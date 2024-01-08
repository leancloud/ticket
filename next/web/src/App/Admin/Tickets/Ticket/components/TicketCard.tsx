import { useState } from 'react';
import { useToggle } from 'react-use';
import { Input, Modal } from 'antd';

import { UserLabel, UserLabelProps } from '@/App/Admin/components/UserLabel';
import { ReplyCard, ReplyCardProps } from './ReplyCard';
import { MarkdownEditor } from './ReplyEditor';

interface UpdateData {
  title: string;
  content: string;
}

export interface TicketCardProps {
  ticket: {
    id: string;
    author?: UserLabelProps['user'];
    authorId: string;
    createdAt: string;
    title: string;
    content: string;
    contentSafeHTML: string;
    files?: ReplyCardProps['files'];
  };
  updateable?: boolean;
  onUpdate?: (data: UpdateData) => void | Promise<void>;
}

export function TicketCard({ ticket, updateable, onUpdate }: TicketCardProps) {
  const [editModalOpen, toggleEditModal] = useToggle(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempContent, setTempContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEdit = () => {
    setTempTitle(ticket.title);
    setTempContent(ticket.content);
    toggleEditModal();
  };

  const handleUpdate = async () => {
    if (isUpdating || !onUpdate) {
      return;
    }
    setIsUpdating(true);
    try {
      await onUpdate({ title: tempTitle, content: tempContent });
      toggleEditModal(false);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <ReplyCard
        id={ticket.id}
        author={ticket.author ? <UserLabel user={ticket.author} /> : 'unknown'}
        createTime={ticket.createdAt}
        content={ticket.contentSafeHTML}
        files={ticket.files}
        menuItems={
          updateable
            ? [
                {
                  key: 'edit',
                  label: '编辑',
                  onClick: handleEdit,
                },
              ]
            : undefined
        }
      />

      <Modal
        open={editModalOpen}
        width={650}
        title="编辑标题和内容"
        onCancel={toggleEditModal}
        onOk={handleUpdate}
        confirmLoading={isUpdating}
      >
        <Input
          placeholder="标题"
          value={tempTitle}
          onChange={(e) => setTempTitle(e.target.value)}
          style={{ marginBottom: 20 }}
        />
        <MarkdownEditor value={tempContent} onChange={setTempContent} onSubmit={handleUpdate} />
      </Modal>
    </>
  );
}
