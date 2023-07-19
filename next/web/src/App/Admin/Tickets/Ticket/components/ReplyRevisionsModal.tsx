import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Empty, Modal, Spin } from 'antd';

import { ReplySchema, useReplyRevisions } from '@/api/reply';
import { BasicReplyCard, BasicReplyCardProps, ReplyContent } from './ReplyCard';
import { UserLabel } from '@/App/Admin/components';
import { Time } from './Time';

export interface ReplyRevisionsModalRef {
  toggle: (reply?: ReplySchema) => void;
}

export const ReplyRevisionsModal = forwardRef<ReplyRevisionsModalRef>((props, ref) => {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState<ReplySchema>();

  const { data: revisions, isLoading } = useReplyRevisions(reply?.id ?? '', {
    enabled: open && !!reply,
  });

  useImperativeHandle(ref, () => ({
    toggle: (reply) => {
      if (reply) {
        setOpen(true);
        setReply(reply);
      } else {
        setOpen(false);
      }
    },
  }));

  const { type, tags } = useMemo(() => {
    let type: BasicReplyCardProps['type'];
    const tags: string[] = [];
    if (reply) {
      if (reply.isCustomerService) {
        type = 'primary';
        tags.push('客服');
      }
      if (reply.internal) {
        type = 'internal';
        tags.push('内部');
      }
    }
    return { type, tags };
  }, [reply]);

  return (
    <Modal open={open} width={700} title="修改记录" onCancel={() => setOpen(false)} footer={false}>
      {isLoading && <Spin />}
      {revisions && revisions.length === 0 && <Empty />}
      {revisions?.map((revision) => (
        <BasicReplyCard
          className="mb-5 last:mb-0"
          type={type}
          title={
            <div className="flex flex-wrap items-center gap-1">
              {revision.operator ? <UserLabel user={revision.operator} /> : <span>unknown</span>}
              {revision.action === 'create' && <span>创建于</span>}
              {revision.action === 'update' && <span>修改于</span>}
              {revision.action === 'delete' && <span>删除于</span>}
              <Time value={revision.actionTime} />
            </div>
          }
          tags={tags}
          files={revision.files}
        >
          <ReplyContent htmlContent={revision.contentSafeHTML} />
        </BasicReplyCard>
      ))}
    </Modal>
  );
});
