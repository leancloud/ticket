import { useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery } from 'react-query';
import { last } from 'lodash-es';

import { db } from '@/leancloud';
import { ReplySchema } from '@/api/reply';
import { fetchTicketReplies, fetchTicketOpsLogs, OpsLog } from '@/api/ticket';
import { useCurrentRef } from '@/utils/useCurrentRef';

export function useTicketReplies(ticketId?: string) {
  const { data, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ['TicketReplies', ticketId],
    queryFn: ({ pageParam }) => {
      return fetchTicketReplies(ticketId || '', {
        cursor: pageParam,
        deleted: true,
        pageSize: 1000,
      });
    },
    enabled: !!ticketId,
    getNextPageParam: (lastPage) => last(lastPage)?.createdAt,
  });

  const replies = useMemo(() => data?.pages.flat(), [data]);
  const lastReply = useRef<ReplySchema>();
  lastReply.current = last(replies);

  const fetchMoreReplies = () => {
    if (lastReply.current) {
      fetchNextPage({
        pageParam: lastReply.current.createdAt,
        cancelRefetch: false,
      });
    } else {
      refetch();
    }
  };

  const onCreate = useCurrentRef(() => {
    fetchMoreReplies();
  });

  const onUpdate = useCurrentRef(() => {
    refetch();
  });

  useEffect(() => {
    if (!ticketId) {
      return;
    }
    let mounted = true;
    const subscription = db
      .query('Reply')
      .where('ticket', '==', db.class('Ticket').object(ticketId))
      .subscribe();
    subscription.then((s) => {
      if (mounted) {
        s.on('create', () => onCreate.current());
        s.on('update', () => onUpdate.current());
      }
    });
    return () => {
      subscription.then((s) => s.unsubscribe());
      mounted = false;
    };
  }, [ticketId]);

  return {
    replies,
    fetchMoreReplies,
    refetchReples: refetch,
  };
}

export function useTicketOpsLogs(ticketId?: string) {
  const { data, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ['TicketOpsLogs', ticketId],
    queryFn: ({ pageParam }) => {
      return fetchTicketOpsLogs(ticketId || '', {
        cursor: pageParam,
        pageSize: 1000,
      });
    },
    enabled: !!ticketId,
    getNextPageParam: (lastPage) => last(lastPage)?.createdAt,
  });

  const opsLogs = useMemo(() => data?.pages.flat(), [data]);
  const lastOpsLog = useRef<OpsLog>();
  lastOpsLog.current = last(opsLogs);

  const fetchMoreOpsLogs = () => {
    if (lastOpsLog.current) {
      fetchNextPage({
        pageParam: lastOpsLog.current.createdAt,
        cancelRefetch: false,
      });
    } else {
      refetch();
    }
  };

  const onCreate = useCurrentRef(() => {
    fetchMoreOpsLogs();
  });

  useEffect(() => {
    if (!ticketId) {
      return;
    }
    let mounted = true;
    const subscription = db
      .query('OpsLog')
      .where('ticket', '==', db.class('Ticket').object(ticketId))
      .subscribe();
    subscription.then((s) => {
      if (mounted) {
        s.on('create', () => onCreate.current());
      }
    });
    return () => {
      mounted = false;
      subscription.then((s) => s.unsubscribe());
    };
  }, [ticketId]);

  return { opsLogs, fetchMoreOpsLogs };
}
