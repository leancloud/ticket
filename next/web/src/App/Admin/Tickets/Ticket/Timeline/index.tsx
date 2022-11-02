import { ReactNode, useMemo } from 'react';
import moment from 'moment';
import { TicketDetailSchema, useTicketReplies } from '@/api/ticket';
import { Skeleton } from '@/components/antd';
import { UserLabel } from '@/App/Admin/components';
import styles from './index.module.css';

interface TimelineProps {
  ticket: TicketDetailSchema;
}

export function Timeline({ ticket }: TimelineProps) {
  const { data: replies, isLoading: loadingReplies } = useTicketReplies(ticket.id);
  const replyItems = useMemo(() => {
    if (!replies) {
      return [];
    }
    return replies.pages.flat();
  }, [replies]);

  return (
    <div className={replies ? styles.timeline : undefined}>
      <ReplyCard
        author={<UserLabel user={ticket.author!} />}
        createTime={ticket.createdAt}
        content={ticket.contentSafeHTML}
      />
      {loadingReplies && <Skeleton active paragraph={{ rows: 4 }} />}
      {replyItems.map(({ id, author, createdAt, contentSafeHTML }) => (
        <ReplyCard
          key={id}
          author={<UserLabel user={author} />}
          createTime={createdAt}
          content={contentSafeHTML}
        />
      ))}
    </div>
  );
}

interface ReplyCardProps {
  author: ReactNode;
  createTime: string;
  content: string;
}

function ReplyCard({ author, createTime, content }: ReplyCardProps) {
  return (
    <div className="border border-[#00000020] rounded-[3px] mb-5 bg-white">
      <div className="flex items-center gap-1 bg-[#00000008] leading-6 px-[15px] py-[10px] border-b border-[#00000020]">
        {author}
        <span>提交于</span>
        <span title={createTime}>{moment(createTime).fromNow()}</span>
      </div>
      <div className="p-[15px] markdown-body" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
