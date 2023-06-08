import { Skeleton } from 'antd';

import { UserLabel } from '@/App/Admin/components';
import { useTicketContext } from '../TicketContext';
import { useTimeline } from './useTimeline';
import { ReplyCard } from './ReplyCard';
import { OpsLog } from './OpsLog';
import styles from './index.module.css';

export function Timeline() {
  const { ticket } = useTicketContext();

  const { data: timeline, isLoading } = useTimeline(ticket.id);

  return (
    <div className={isLoading ? undefined : styles.timeline}>
      <ReplyCard
        id={ticket.id}
        author={ticket.author ? <UserLabel user={ticket.author} /> : 'unknown'}
        createTime={ticket.createdAt}
        content={ticket.contentSafeHTML}
        files={ticket.files}
      />
      {isLoading && <Skeleton active paragraph={{ rows: 4 }} />}
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
            />
          );
        } else {
          return <OpsLog key={timeline.data.id} data={timeline.data} />;
        }
      })}
    </div>
  );
}
