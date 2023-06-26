import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Modal } from 'antd';

import { ReplySchema } from '@/api/reply';
import { Uploader, UploaderRef } from '@/App/Admin/components/Uploader';
import { MarkdownEditor } from './ReplyEditor';

export interface EditReplyModalRef {
  toggle: (reply: ReplySchema | undefined) => void;
}

interface EditReplyModalProps {
  loading?: boolean;
  onSave: (id: string, content: string, fileIds: string[]) => void;
}

export const EditReplyModal = forwardRef<EditReplyModalRef, EditReplyModalProps>(
  ({ loading, onSave }, ref) => {
    const [open, setOpen] = useState(false);
    const [replyId, setReplyId] = useState('');
    const [content, setContent] = useState('');
    const uploaderRef = useRef<UploaderRef>(null!);

    const toggle = (reply: ReplySchema | undefined) => {
      if (reply) {
        setOpen(true);
        setReplyId(reply.id);
        setContent(reply.content);
        setTimeout(() => {
          uploaderRef.current.reset(reply.files);
        }, 100);
      } else {
        setOpen(false);
      }
    };

    useImperativeHandle(ref, () => ({ toggle }));

    const handleSubmit = () => {
      const { fileIds, uploading, hasError } = uploaderRef.current.getStatus();
      if (uploading) {
        return alert('请等待全部文件上传完毕');
      }
      if (hasError) {
        return alert('请移除上传失败的文件');
      }
      onSave(replyId, content, fileIds);
    };

    return (
      <Modal
        open={open}
        width={650}
        title="编辑回复"
        onOk={handleSubmit}
        onCancel={() => !loading && setOpen(false)}
        confirmLoading={loading}
        cancelButtonProps={{ disabled: loading }}
        bodyStyle={{ padding: 16 }}
      >
        <MarkdownEditor
          className="mb-2"
          value={content}
          onChange={setContent}
          onSubmit={handleSubmit}
        />
        <Uploader ref={uploaderRef} />
      </Modal>
    );
  }
);
