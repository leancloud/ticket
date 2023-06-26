import { ReactNode, useMemo, useRef } from 'react';
import { Skeleton } from 'antd';

import { ReplySchema, useUpdateReply } from '@/api/reply';
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

export function Timeline({ header, replies, opsLogs }: TimelineProps) {
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
    }
  };

  return (
    <div className={loading ? undefined : styles.timeline}>
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
              editable
              edited={timeline.data.createdAt !== timeline.data.updatedAt}
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
