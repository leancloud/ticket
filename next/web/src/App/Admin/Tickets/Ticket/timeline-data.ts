import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from 'react-query';
import { LCObject } from 'open-leancloud-storage/core';
import { last } from 'lodash-es';

import { db } from '@/leancloud';
import { fetchTicketReplies, fetchTicketOpsLogs } from '@/api/ticket';
import { useCurrentRef } from '@/utils/useCurrentRef';

export function useTicketReplies(ticketId?: string) {
  const { data, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ['TicketReplies', ticketId],
    queryFn: ({ pageParam }) => {
      return fetchTicketReplies(ticketId || '', {
        cursor: pageParam,
        deleted: true,
      });
    },
    enabled: !!ticketId,
    getNextPageParam: (lastPage) => last(lastPage)?.createdAt,
  });

  const replies = useMemo(() => data?.pages.flat(), [data]);

  const fetchMoreReplies = () => {
    const lastReply = last(replies);
    if (lastReply) {
      fetchNextPage({
        pageParam: lastReply.createdAt,
        cancelRefetch: false,
      });
    } else {
      refetch();
    }
  };

  const onCreate = useCurrentRef((obj: LCObject) => {
    const lastReply = last(replies);
    if (!lastReply || new Date(lastReply.createdAt) < new Date(obj.createdAt)) {
      fetchMoreReplies();
    }
  });

  const onUpdate = useCurrentRef((obj: LCObject) => {
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
        s.on('create', (obj) => onCreate.current(obj));
        s.on('update', (obj) => onUpdate.current(obj));
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
    queryFn: ({ pageParam }) => fetchTicketOpsLogs(ticketId || '', pageParam),
    enabled: !!ticketId,
    getNextPageParam: (lastPage) => last(lastPage)?.createdAt,
  });

  const opsLogs = useMemo(() => data?.pages.flat(), [data]);

  const fetchMoreOpsLogs = () => {
    const lastOpsLog = last(opsLogs);
    if (lastOpsLog) {
      fetchNextPage({
        pageParam: lastOpsLog.createdAt,
        cancelRefetch: false,
      });
    } else {
      refetch();
    }
  };

  const onCreate = useCurrentRef((obj: LCObject) => {
    const lastOpsLog = last(opsLogs);
    if (!lastOpsLog || new Date(lastOpsLog.createdAt) < new Date(obj.createdAt)) {
      fetchMoreOpsLogs();
    }
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
        s.on('create', (obj) => onCreate.current(obj));
      }
    });
    return () => {
      mounted = false;
      subscription.then((s) => s.unsubscribe());
    };
  }, [ticketId]);

  return { opsLogs, fetchMoreOpsLogs };
}
