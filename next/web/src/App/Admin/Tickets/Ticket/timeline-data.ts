import { useEffect, useMemo, useState } from 'react';
import { useMountedState } from 'react-use';
import { last } from 'lodash-es';

import { db } from '@/leancloud';
import { ReplySchema } from '@/api/reply';
import { fetchTicketReplies, fetchTicketOpsLogs, OpsLog } from '@/api/ticket';
import { useCurrentRef } from '@/utils/useCurrentRef';
import { useEffectEvent } from '@/utils/useEffectEvent';

interface Reader<T> {
  read: () => Promise<T | undefined>;
  peek: () => Promise<T | undefined>;
}

interface FetchResult<T> {
  value: T[];
  done: boolean;
}

class FetchReader<T, S> implements Reader<T> {
  private buffer: T[] = [];
  private position = 0;
  private done = false;

  constructor(private state: S, private fetch: (state: S) => Promise<FetchResult<T>>) {}

  async peek() {
    if (!this.done && this.position === this.buffer.length) {
      const { value, done } = await this.fetch(this.state);
      this.buffer = value;
      this.position = 0;
      this.done = done;
    }
    if (this.position < this.buffer.length) {
      return this.buffer[this.position];
    }
    return undefined;
  }

  async read() {
    const value = await this.peek();
    if (value !== undefined) {
      this.position += 1;
    }
    return value;
  }
}

class SortReader<T> implements Reader<T> {
  constructor(private readers: Reader<T>[], private cmp: (v1: T, v2: T) => number) {}

  async peek() {
    let minReader: Reader<T> | undefined;
    let minValue: T | undefined;
    for (const reader of this.readers) {
      const value = await reader.peek();
      if (value !== undefined && (minValue === undefined || this.cmp(value, minValue) < 0)) {
        minReader = reader;
        minValue = value;
      }
    }
    return minValue;
  }

  async read() {
    let minReader: Reader<T> | undefined;
    let minValue: T | undefined;
    for (const reader of this.readers) {
      const value = await reader.peek();
      if (value !== undefined && (minValue === undefined || this.cmp(value, minValue) < 0)) {
        minReader = reader;
        minValue = value;
      }
    }
    return minReader?.read();
  }
}

async function take<T>(reader: Reader<T>, count: number) {
  const result: T[] = [];
  for (let i = 0; i < count; i += 1) {
    const value = await reader.read();
    if (value === undefined) {
      break;
    }
    result.push(value);
  }
  return result;
}

type TimelineData =
  | {
      type: 'reply';
      ts: number;
      data: ReplySchema;
    }
  | {
      type: 'opsLog';
      ts: number;
      data: OpsLog;
    };

interface TimelineReaderState {
  ticketId: string;
  pageSize: number;
  cursor?: string;
  desc?: boolean;
}

function createReplyReader(state: TimelineReaderState) {
  return new FetchReader({ ...state }, async (state) => {
    const { ticketId, pageSize, cursor, desc } = state;
    const replies = await fetchTicketReplies(ticketId, {
      cursor,
      pageSize,
      deleted: true,
      desc,
    });
    state.cursor = last(replies)?.createdAt;
    return {
      value: replies.map<TimelineData>((reply) => ({
        type: 'reply',
        ts: new Date(reply.createdAt).getTime(),
        data: reply,
      })),
      done: replies.length < pageSize,
    };
  });
}

function createOpsLogReader(state: TimelineReaderState) {
  return new FetchReader({ ...state }, async (state) => {
    const { ticketId, pageSize, cursor, desc } = state;
    const opsLogs = await fetchTicketOpsLogs(ticketId, {
      cursor,
      pageSize,
      desc,
    });
    state.cursor = last(opsLogs)?.createdAt;
    return {
      value: opsLogs.map<TimelineData>((opsLog) => ({
        type: 'opsLog',
        ts: new Date(opsLog.createdAt).getTime(),
        data: opsLog,
      })),
      done: opsLogs.length < pageSize,
    };
  });
}

function createTimelineReader(state: TimelineReaderState) {
  const replyReader = createReplyReader(state);
  const opsLogReader = createOpsLogReader(state);
  return state.desc
    ? new SortReader([replyReader, opsLogReader], (a, b) => b.ts - a.ts)
    : new SortReader([replyReader, opsLogReader], (a, b) => a.ts - b.ts);
}

type UseTimelineData = TimelineData | { type: 'gap' };

const dataPageSize = 50;
const reverseDataPageSize = 50;

export function useTimeline(ticketId?: string) {
  const [timelineReader, setTimelineReader] = useState<Reader<TimelineData>>();

  const ticketIdRef = useCurrentRef(ticketId);
  const isMounted = useMountedState();

  const [data, setData] = useState<TimelineData[]>();
  const [reverseData, setReverseData] = useState<TimelineData[]>();
  const [moreData, setMoreData] = useState<TimelineData[]>();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGap, setIsLoadingGap] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const refetch = useEffectEvent(async () => {
    const ticketId = ticketIdRef.current;
    if (!ticketId) return;

    const timelineReader = createTimelineReader({
      ticketId,
      pageSize: dataPageSize,
    });
    const reverseTimelineReader = createTimelineReader({
      ticketId,
      pageSize: reverseDataPageSize,
      desc: true,
    });

    setTimelineReader(timelineReader);

    try {
      setIsLoading(true);
      const data = await take(timelineReader, dataPageSize);
      const reverseData =
        data.length === dataPageSize
          ? await take(reverseTimelineReader, reverseDataPageSize)
          : undefined;
      if (ticketId === ticketIdRef.current && isMounted()) {
        setMoreData(undefined);
        setData(data);
        setReverseData(reverseData);
      }
    } finally {
      if (ticketId === ticketIdRef.current && isMounted()) {
        setIsLoading(false);
      }
    }
  });

  useEffect(() => {
    refetch();
  }, [ticketId]);

  const loadGap = useEffectEvent(async () => {
    if (isLoadingGap) return;
    if (!data?.length || !reverseData?.length) return;
    if (last(data)!.ts >= last(reverseData)!.ts) return;
    if (!timelineReader) return;
    const ticketId = ticketIdRef.current;
    try {
      setIsLoadingGap(true);
      const newData = await take(timelineReader, dataPageSize);
      if (ticketId === ticketIdRef.current && isMounted()) {
        setData((data) => [...(data || []), ...newData]);
      }
    } finally {
      if (ticketId === ticketIdRef.current && isMounted()) {
        setIsLoadingGap(false);
      }
    }
  });

  const loadMore = useEffectEvent(async () => {
    if (isLoading || isLoadingMore) return;
    const lastItem = last(moreData) || reverseData?.[0] || last(data);
    if (!lastItem) {
      refetch();
      return;
    }
    const ticketId = ticketIdRef.current;
    if (!ticketId) return;
    try {
      setIsLoadingMore(true);
      const cursor = lastItem.data.createdAt;
      const reader = createTimelineReader({ ticketId, cursor, pageSize: 10 });
      const data = await take(reader, 10);
      if (ticketId === ticketIdRef.current && isMounted()) {
        setMoreData((prev) => [...(prev || []), ...data]);
      }
    } finally {
      if (ticketId === ticketIdRef.current && isMounted()) {
        setIsLoadingMore(false);
      }
    }
  });

  const combinedData = useMemo(() => {
    let combinedData: UseTimelineData[] | undefined = data;
    if (data?.length && reverseData?.length) {
      const lastDataTs = last(data)!.ts;
      const overlapIdx = reverseData.findIndex((v) => v.ts <= lastDataTs);
      if (overlapIdx === -1) {
        combinedData = [...data, { type: 'gap' }, ...reverseData.slice().reverse()];
      } else {
        combinedData = [...data, ...reverseData.slice(0, overlapIdx).reverse()];
      }
    }
    if (moreData?.length) {
      combinedData = [...(combinedData || []), ...moreData];
    }
    return combinedData;
  }, [data, reverseData, moreData]);

  // Reply subscription
  useEffect(() => {
    if (!ticketId) {
      return;
    }
    const subscription = db
      .query('Reply')
      .where('ticket', '==', db.class('Ticket').object(ticketId))
      .subscribe();
    subscription.then((s) => {
      if (isMounted()) {
        s.on('create', () => loadMore());
        s.on('update', () => refetch());
      }
    });
    return () => {
      subscription.then((s) => s.unsubscribe());
    };
  }, [ticketId]);

  // OpsLog subscription
  useEffect(() => {
    if (!ticketId) {
      return;
    }
    const subscription = db
      .query('OpsLog')
      .where('ticket', '==', db.class('Ticket').object(ticketId))
      .subscribe();
    subscription.then((s) => {
      if (isMounted()) {
        s.on('create', () => loadMore());
      }
    });
    return () => {
      subscription.then((s) => s.unsubscribe());
    };
  }, [ticketId]);

  return {
    data: combinedData,
    isLoading: !data && isLoading,
    isLoadingGap,
    isLoadingMore,
    refetch,
    loadGap,
    loadMore,
  };
}
