import { ReactNode, useMemo } from 'react';
import { Skeleton } from 'antd';

import { ReplySchema } from '@/api/reply';
import { OpsLog as OpsLogSchema } from '@/api/ticket';
import { UserLabel } from '@/App/Admin/components';
import { ReplyCard } from '../components/ReplyCard';
import { OpsLog } from '../components/OpsLog';
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
            />
          );
        } else {
          return <OpsLog key={timeline.data.id} data={timeline.data} />;
        }
      })}
    </div>
  );
}
