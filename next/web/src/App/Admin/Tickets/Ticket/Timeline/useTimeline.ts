import { useMemo } from 'react';

import { ReplySchema } from '@/api/reply';
import { OpsLog, useTicketOpsLogs, useTicketReplies } from '@/api/ticket';

type TimelineData =
  | {
      type: 'reply';
      data: ReplySchema;
      createTime: number;
    }
  | {
      type: 'opsLog';
      data: OpsLog;
      createTime: number;
    };

export function useTimeline(ticketId: string) {
  const { data: replies, isLoading: loadingReplies } = useTicketReplies(ticketId);
  const { data: opsLogs, isLoading: loadingOpsLogs } = useTicketOpsLogs(ticketId);

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

  return {
    data: timeline,
    isLoading: loadingReplies || loadingOpsLogs,
  };
}
