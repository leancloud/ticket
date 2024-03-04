import { addMilliseconds, subMilliseconds } from 'date-fns';
import _ from 'lodash';

import { OpsLog } from '@/model/OpsLog';
import { ReplyRevision } from '@/model/ReplyRevision';
import { User } from '@/model/User';
import { Reply } from '@/model/Reply';

export interface GetCustomerServiceActionLogsOptions {
  from: Date;
  to: Date;
  operatorIds?: string[];
  limit?: number;
  desc?: boolean;
}

export enum CustomerServiceActionLogType {
  Reply = 1,
  OpsLog = 2,
}

export type CustomerServiceActionLog =
  | {
      id: string;
      type: CustomerServiceActionLogType.Reply;
      operatorId: string;
      reply?: Reply;
      revision?: ReplyRevision;
      ts: Date;
    }
  | {
      id: string;
      type: CustomerServiceActionLogType.OpsLog;
      operatorId: string;
      opsLog: OpsLog;
      ts: Date;
    };

interface Reader<T = any> {
  peek: () => Promise<T | undefined>;
  read: () => Promise<T | undefined>;
}

interface BufferReaderValue<T> {
  value: T;
  done: boolean;
}

interface BufferReaderOptions<TState, TData> {
  state: TState;
  read: (state: TState) => Promise<BufferReaderValue<TData[]>>;
}

class BufferReader<TData, TState> implements Reader<TData> {
  private buffer: TData[] = [];
  private pos = 0;
  private done = false;

  constructor(private options: BufferReaderOptions<TState, TData>) {}

  private async load() {
    if (this.done) {
      return;
    }
    const value = await this.options.read(this.options.state);
    this.buffer = [...this.buffer.slice(this.pos), ...value.value];
    this.pos = 0;
    this.done = value.done;
  }

  async peek() {
    if (this.pos === this.buffer.length) {
      await this.load();
    }
    if (this.pos < this.buffer.length) {
      return this.buffer[this.pos];
    }
  }

  async read() {
    if (this.pos === this.buffer.length) {
      await this.load();
    }
    if (this.pos < this.buffer.length) {
      return this.buffer[this.pos++];
    }
  }
}

class SortReader<T> implements Reader<T> {
  constructor(private readers: Reader<T>[], private compare: (v1: T, v2: T) => number) {}

  async peek(): Promise<T> {
    throw new Error('peek not supported');
  }

  async read() {
    let minValue: T | undefined;
    let minReader: Reader<T> | undefined;

    for (const reader of this.readers) {
      const currentValue = await reader.peek();
      if (!currentValue) {
        continue;
      }
      if (minValue === undefined || this.compare(currentValue, minValue) <= 0) {
        minValue = currentValue;
        minReader = reader;
      }
    }

    if (minValue !== undefined && minReader) {
      return minReader.read();
    }
  }
}

async function take<T>(reader: Reader<T>, count: number) {
  const result: T[] = [];
  for (let i = 0; i < count; i += 1) {
    const value = await reader.read();
    if (!value) {
      break;
    }
    result.push(value);
  }
  return result;
}

export class CustomerServiceActionLogService {
  async getLogs(options: GetCustomerServiceActionLogsOptions) {
    const { limit = 10, desc } = options;
    const perCount = limit <= 100 ? limit : Math.min(Math.floor(limit / 2), 1000);

    const replyReader = new BufferReader({
      state: {
        window: [options.from, options.to],
        operatorIds: options.operatorIds,
        desc: options.desc,
        perCount,
      },
      read: async (state) => {
        const query = Reply.queryBuilder()
          .where('createdAt', '>=', state.window[0])
          .where('createdAt', '<=', state.window[1])
          .where('isCustomerService', '==', true)
          .limit(state.perCount)
          .orderBy('createdAt', state.desc ? 'desc' : 'asc');
        if (state.operatorIds) {
          const pointers = state.operatorIds.map(User.ptr.bind(User));
          query.where('author', 'in', pointers);
        }

        const replies = await query.find({ useMasterKey: true });

        if (replies.length) {
          const last = replies[replies.length - 1];
          if (state.desc) {
            state.window[1] = subMilliseconds(last.createdAt, 1);
          } else {
            state.window[0] = addMilliseconds(last.createdAt, 1);
          }
        }

        const value = replies.map<CustomerServiceActionLog>((reply) => ({
          id: reply.id,
          type: CustomerServiceActionLogType.Reply,
          operatorId: reply.authorId,
          reply,
          ts: reply.createdAt,
        }));

        return {
          value,
          done: replies.length < state.perCount,
        };
      },
    });

    const replyRevisionReader = new BufferReader({
      state: {
        window: [options.from, options.to],
        operatorIds: options.operatorIds,
        desc: options.desc,
        perCount,
      },
      read: async (state) => {
        const query = ReplyRevision.queryBuilder()
          .where('actionTime', '>=', state.window[0])
          .where('actionTime', '<=', state.window[1])
          .where('action', 'in', ['update', 'delete'])
          .preload('reply')
          .limit(state.perCount)
          .orderBy('actionTime', state.desc ? 'desc' : 'asc');
        if (state.operatorIds) {
          const pointers = state.operatorIds.map(User.ptr.bind(User));
          query.where('operator', 'in', pointers);
        }

        const revisions = await query.find({ useMasterKey: true });

        if (revisions.length) {
          const last = revisions[revisions.length - 1];
          if (state.desc) {
            state.window[1] = subMilliseconds(last.actionTime, 1);
          } else {
            state.window[0] = addMilliseconds(last.actionTime, 1);
          }
        }

        const value = revisions.map<CustomerServiceActionLog>((rv) => ({
          id: rv.id,
          type: CustomerServiceActionLogType.Reply,
          operatorId: rv.operatorId,
          reply: rv.reply,
          revision: rv,
          ts: rv.actionTime,
        }));

        return {
          value,
          done: revisions.length < state.perCount,
        };
      },
    });

    const opsLogReader = new BufferReader({
      state: {
        window: [options.from, options.to],
        operatorIds: options.operatorIds,
        desc: options.desc,
        perCount,
      },
      read: async (state) => {
        const query = OpsLog.queryBuilder()
          .where('createdAt', '>=', state.window[0])
          .where('createdAt', '<=', state.window[1])
          .limit(state.perCount)
          .orderBy('createdAt', state.desc ? 'desc' : 'asc');
        if (state.operatorIds) {
          query.where('data.operator.objectId', 'in', state.operatorIds);
        } else {
          query.where('data.operator.objectId', 'exists');
          query.where('data.operator.objectId', '!=', 'system');
        }

        const opsLogs = await query.find({ useMasterKey: true });

        if (opsLogs.length) {
          const last = opsLogs[opsLogs.length - 1];
          if (state.desc) {
            state.window[1] = subMilliseconds(last.createdAt, 1);
          } else {
            state.window[0] = addMilliseconds(last.createdAt, 1);
          }
        }

        const value = opsLogs.map<CustomerServiceActionLog>((opsLog) => ({
          id: opsLog.id,
          type: CustomerServiceActionLogType.OpsLog,
          operatorId: opsLog.data.operator.objectId,
          opsLog,
          ts: opsLog.createdAt,
        }));

        return {
          value,
          done: opsLogs.length < state.perCount,
        };
      },
    });

    const sortReader = new SortReader(
      [replyReader, replyRevisionReader, opsLogReader],
      desc ? (a, b) => b.ts.getTime() - a.ts.getTime() : (a, b) => a.ts.getTime() - b.ts.getTime()
    );

    return take(sortReader, limit);
  }
}

export const customerServiceActionLogService = new CustomerServiceActionLogService();
