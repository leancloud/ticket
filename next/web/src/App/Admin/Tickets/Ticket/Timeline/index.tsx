import { ReactNode, useRef } from 'react';
import { Button, Divider, Modal, Skeleton } from 'antd';
import cx from 'classnames';

import { ReplySchema, useDeleteReply, useUpdateReply } from '@/api/reply';
import { OpsLog as OpsLogSchema } from '@/api/ticket';
import { UserLabel } from '@/App/Admin/components';
import { ReplyCard, ReplyCardProps } from '../components/ReplyCard';
import { OpsLog } from '../components/OpsLog';
import { EditReplyModal, EditReplyModalRef } from '../components/EditReplyModal';
import { ReplyRevisionsModal, ReplyRevisionsModalRef } from '../components/ReplyRevisionsModal';
import styles from './index.module.css';

type TimelineData =
  | {
      type: 'reply';
      data: ReplySchema;
    }
  | {
      type: 'opsLog';
      data: OpsLogSchema;
    }
  | {
      type: 'gap';
    };

interface TimelineProps {
  header?: ReactNode;
  timeline?: TimelineData[];
  loading?: boolean;
  onRefetchReplies: () => void;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export function Timeline({
  header,
  timeline,
  loading,
  onRefetchReplies,
  onLoadMore,
  loadingMore,
}: TimelineProps) {
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

  const createMenuItems = (reply: ReplySchema) => {
    if (!reply.isCustomerService) return;
    const menuItems: ReplyCardProps['menuItems'] = [];
    if (reply.deletedAt) {
      menuItems.push({ label: '修改记录', key: 'revisions' });
    } else {
      menuItems.push({ label: '编辑', key: 'edit' });
      if (reply.edited) {
        menuItems.push({ label: '修改记录', key: 'revisions' });
      }
      menuItems.push({ type: 'divider' }, { label: '删除', key: 'delete', danger: true });
    }
    return menuItems;
  };

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
      {timeline?.map((timeline) => {
        switch (timeline.type) {
          case 'reply':
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
                menuItems={createMenuItems(timeline.data)}
                onClickMenu={(key) => handleClickMenu(timeline.data, key)}
              />
            );
          case 'opsLog':
            return <OpsLog key={timeline.data.id} data={timeline.data} />;
          case 'gap':
            return (
              <div key="gap" className="bg-white py-5">
                <Divider>
                  <Button loading={loadingMore} onClick={() => onLoadMore?.()}>
                    加载更多...
                  </Button>
                </Divider>
              </div>
            );
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
