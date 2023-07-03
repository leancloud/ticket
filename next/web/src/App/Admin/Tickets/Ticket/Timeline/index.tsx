import { ReactNode, useMemo, useRef } from 'react';
import { Modal, Skeleton } from 'antd';
import cx from 'classnames';

import { ReplySchema, useDeleteReply, useUpdateReply } from '@/api/reply';
import { OpsLog as OpsLogSchema } from '@/api/ticket';
import { UserLabel } from '@/App/Admin/components';
import { ReplyCard } from '../components/ReplyCard';
import { OpsLog } from '../components/OpsLog';
import { EditReplyModal, EditReplyModalRef } from '../components/EditReplyModal';
import { ReplyRevisionsModal, ReplyRevisionsModalRef } from '../components/ReplyRevisionsModal';
import styles from './index.module.css';

type TimelineData =
  | {
      type: 'reply';
      data: ReplySchema;
      createTime: number;
    }
  | {
      type: 'opsLog';
      data: OpsLogSchema;
      createTime: number;
    };

interface TimelineProps {
  header?: ReactNode;
  replies?: ReplySchema[];
  opsLogs?: OpsLogSchema[];
  onRefetchReplies: () => void;
}

export function Timeline({ header, replies, opsLogs, onRefetchReplies }: TimelineProps) {
  const timeline = useMemo(() => {
    const timeline: TimelineData[] = [];
    replies?.forEach((data) =>
      timeline.push({ type: 'reply', data, createTime: new Date(data.createdAt).getTime() })
    );
    opsLogs?.forEach((data) =>
      timeline.push({ type: 'opsLog', data, createTime: new Date(data.createdAt).getTime() })
    );
    return timeline.sort((a, b) => a.createTime - b.createTime);
  }, [replies, opsLogs]);

  const loading = !replies && !opsLogs;

  const editReplyModalRef = useRef<EditReplyModalRef>(null!);
  const replyRevisionsModalRef = useRef<ReplyRevisionsModalRef>(null!);

  const updateReply = useUpdateReply({
    onSuccess: () => {
      editReplyModalRef.current.toggle(undefined);
      onRefetchReplies();
    },
  });

  const deleteReply = useDeleteReply({
    onSuccess: () => {
      onRefetchReplies();
    },
  });

  const handleClickMenu = (reply: ReplySchema, key: string) => {
    switch (key) {
      case 'edit':
        editReplyModalRef.current.toggle(reply);
        break;
      case 'revisions':
        replyRevisionsModalRef.current.toggle(reply);
        break;
      case 'delete':
        Modal.confirm({
          title: '回复将被删除',
          content: '已发送给用户的通知不会被撤回，用户可能已经阅读了该回复。',
          okType: 'danger',
          onOk: () => deleteReply.mutateAsync(reply.id),
        });
        break;
    }
  };

  return (
    <div
      className={cx('space-y-5 mb-5', {
        [styles.timeline]: !loading,
      })}
    >
      {header}
      {loading && <Skeleton active paragraph={{ rows: 4 }} />}
      {timeline.map((timeline) => {
        if (timeline.type === 'reply') {
          return (
            <ReplyCard
              key={timeline.data.id}
              id={timeline.data.id}
              author={<UserLabel user={timeline.data.author} />}
              createTime={timeline.data.createdAt}
              content={timeline.data.contentSafeHTML}
              files={timeline.data.files}
              isAgent={timeline.data.isCustomerService}
              isInternal={timeline.data.internal}
              edited={timeline.data.edited}
              deleted={!!timeline.data.deletedAt}
              onClickMenu={(key) => handleClickMenu(timeline.data, key)}
            />
          );
        } else {
          return <OpsLog key={timeline.data.id} data={timeline.data} />;
        }
      })}

      <EditReplyModal
        ref={editReplyModalRef}
        loading={updateReply.isLoading}
        onSave={(id, content, fileIds) => updateReply.mutate([id, { content, fileIds }])}
      />

      <ReplyRevisionsModal ref={replyRevisionsModalRef} />
    </div>
  );
}
