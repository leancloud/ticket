import { useEffect, useState } from 'react';
import { useGetSet, useLatest, useMountedState } from 'react-use';
import { last } from 'lodash-es';

import { db } from '@/leancloud';
import { ReplySchema } from '@/api/reply';
import { fetchTicketReplies, fetchTicketOpsLogs, OpsLog } from '@/api/ticket';
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

type TimelineGap = { type: 'gap'; ts: number };

type UseTimelineData = TimelineData | TimelineGap;

const dataPageSize = 25;
const reverseDataPageSize = 25;

export function useTimeline(ticketId?: string) {
  const [timelineReader, setTimelineReader] = useState<Reader<TimelineData>>();

  const isMounted = useMountedState();
  const currentTicketId = useLatest(ticketId);

  const [data, setData] = useState<UseTimelineData[]>();

  const [isLoading, setIsLoading] = useGetSet(false);
  const [isLoadingGap, setIsLoadingGap] = useGetSet(false);
  const [isLoadingMore, setIsLoadingMore] = useGetSet(false);

  const refetch = useEffectEvent(async () => {
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
    setIsLoading(true);

    try {
      let data: UseTimelineData[] = await take(timelineReader, dataPageSize);
      if (data.length === dataPageSize) {
        const lastItemTs = last(data)!.ts;
        let reverseData = await take(reverseTimelineReader, reverseDataPageSize);
        reverseData = reverseData.filter((item) => item.ts > lastItemTs);
        if (reverseData.length === reverseDataPageSize) {
          data = [...data, { type: 'gap', ts: lastItemTs }, ...reverseData.reverse()];
        } else {
          data = [...data, ...reverseData.reverse()];
        }
      }
      if (isMounted() && ticketId === currentTicketId.current) {
        setData(data);
      }
    } finally {
      if (isMounted() && ticketId === currentTicketId.current) {
        setIsLoading(false);
      }
    }
  });

  useEffect(() => {
    refetch();
  }, [ticketId]);

  const loadGap = useEffectEvent(async () => {
    if (!data || !timelineReader) return;

    const gapIndex = data.findIndex((item) => item.type === 'gap');
    if (gapIndex === -1) return;
    const gap = data[gapIndex] as TimelineGap;

    setIsLoadingGap(true);

    try {
      let newData = await take(timelineReader, dataPageSize);
      if (isMounted() && newData.length) {
        setData((_data) => {
          if (!_data) {
            return _data;
          }
          const _gapIndex = _data.findIndex((item) => item.type === 'gap');
          if (_gapIndex !== gapIndex || gap.ts !== _data[gapIndex].ts) {
            return _data;
          }
          if (gapIndex < _data.length - 1) {
            const gapNextItem = _data[gapIndex + 1];
            newData = newData.filter((item) => item.ts < gapNextItem.ts);
          }
          if (newData.length > 0 && newData.length === dataPageSize) {
            return [
              ..._data.slice(0, gapIndex),
              ...newData,
              { type: 'gap', ts: last(newData)!.ts },
              ..._data.slice(gapIndex + 1),
            ];
          } else {
            return [..._data.slice(0, gapIndex), ...newData, ..._data.slice(gapIndex + 1)];
          }
        });
      }
    } finally {
      if (isMounted()) {
        setIsLoadingGap(false);
      }
    }
  });

  const loadMore = useEffectEvent(async () => {
    if (!ticketId) return;

    if (!data || data.length === 0) {
      refetch();
      return;
    }

    setIsLoadingMore(true);

    try {
      const cursor = (last(data) as TimelineData).data.createdAt;
      const reader = createTimelineReader({ ticketId, cursor, pageSize: 10 });
      const newData = await take(reader, 10);
      if (isMounted()) {
        setData((prev) => (prev === data ? [...prev, ...newData] : prev));
      }
    } finally {
      if (isMounted()) {
        setIsLoadingMore(false);
      }
    }
  });

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
    data,
    isLoading: !data && isLoading(),
    isLoadingGap: isLoadingGap(),
    isLoadingMore: isLoadingMore(),
    refetch,
    loadGap,
    loadMore,
  };
}
