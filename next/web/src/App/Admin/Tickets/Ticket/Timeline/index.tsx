import { Skeleton } from 'antd';

import { UserLabel } from '@/App/Admin/components';
import { MixedTicket } from '../mixed-ticket';
import { TimelineData } from './useTimeline';
import { ReplyCard } from './ReplyCard';
import { OpsLog } from './OpsLog';
import styles from './index.module.css';

interface TimelineProps {
  ticket: MixedTicket;
  timeline?: TimelineData[];
  loading?: boolean;
}

export function Timeline({ ticket, timeline, loading }: TimelineProps) {
  return (
    <div className={loading ? undefined : styles.timeline}>
      <ReplyCard
        id={ticket.id}
        author={ticket.author ? <UserLabel user={ticket.author} /> : 'unknown'}
        createTime={ticket.createdAt}
        content={ticket.contentSafeHTML}
        files={ticket.files}
      />
      {loading && <Skeleton active paragraph={{ rows: 4 }} />}
      {timeline?.map((timeline) => {
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
            />
          );
        } else {
          return <OpsLog key={timeline.data.id} data={timeline.data} />;
        }
      })}
    </div>
  );
}
