import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from 'react-query';
import { LCObject } from 'open-leancloud-storage/core';
import { last } from 'lodash-es';

import { db } from '@/leancloud';
import { fetchTicketReplies, fetchTicketOpsLogs } from '@/api/ticket';
import { useCurrentRef } from '@/utils/useCurrentRef';

export function useTicketReplies(ticketId?: string) {
  const { data, fetchNextPage, refetch } = useInfiniteQuery({
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

  const queryClient = useQueryClient();
  const deleteReply = (id: string) => {
    queryClient.setQueryData<typeof data>(['TicketReplies', ticketId], (data) => {
      if (data) {
        return {
          pageParams: data.pageParams,
          pages: data.pages.map((replies) => replies.filter((r) => r.id !== id)),
        };
      }
    });
  };

  const replies = useMemo(() => data?.pages.flat(), [data]);

  const onCreate = useCurrentRef((obj: LCObject) => {
    const lastReply = last(replies);
    if (!lastReply || new Date(lastReply.createdAt) < new Date(obj.createdAt)) {
      fetchNextPage();
    }
  });

  const onUpdate = useCurrentRef((obj: LCObject) => {
    if (obj.data.daletedAt) {
      // soft delete
      deleteReply(obj.id);
    } else {
      refetch();
    }
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
    fetchMoreReplies: fetchNextPage,
    refetchReples: refetch,
    deleteReply,
  };
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

  const onCreate = useCurrentRef((obj: LCObject) => {
    const lastOpsLog = last(opsLogs);
    if (!lastOpsLog || new Date(lastOpsLog.createdAt) < new Date(obj.createdAt)) {
      fetchNextPage();
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

  return { opsLogs, fetchMoreOpsLogs: fetchNextPage };
}
