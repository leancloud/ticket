import { useMemo } from 'react';
import { useInfiniteQuery } from 'react-query';

import { fetchTicketReplies, fetchTicketOpsLogs } from '@/api/ticket';

export function useTicketReplies(ticketId?: string) {
  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: ['TicketReplies', ticketId],
    queryFn: ({ pageParam }) => fetchTicketReplies(ticketId || '', pageParam || undefined),
    enabled: !!ticketId,
    getNextPageParam: (lastPage) => {
      if (lastPage.length) {
        return lastPage[lastPage.length - 1].createdAt;
      }
      return null;
    },
  });

  const replies = useMemo(() => data?.pages.flat(), [data]);

  return { replies, fetchMoreReplies: fetchNextPage };
}

export function useTicketOpsLogs(ticketId?: string) {
  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: ['TicketOpsLogs', ticketId],
    queryFn: ({ pageParam }) => fetchTicketOpsLogs(ticketId || '', pageParam || undefined),
    enabled: !!ticketId,
    getNextPageParam: (lastPage) => {
      if (lastPage.length) {
        return lastPage[lastPage.length - 1].createdAt;
      }
      return null;
    },
  });

  const opsLogs = useMemo(() => data?.pages.flat(), [data]);

  return { opsLogs, fetchMoreOpsLogs: fetchNextPage };
}
