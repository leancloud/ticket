import { isEqual } from 'date-fns';
import _ from 'lodash';

import { OpsLog } from '@/model/OpsLog';
import { ReplyRevision } from '@/model/ReplyRevision';
import { User } from '@/model/User';
import { Reply } from '@/model/Reply';
import { Model, Query, QueryBuilder } from '@/orm';

export interface GetCustomerServiceActionLogsOptions {
  from: Date;
  to: Date;
  operatorIds?: string[];
  limit?: number;
  desc?: boolean;
  exclude?: string[];
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

type DateField<T> = Extract<
  {
    [K in keyof T]: T[K] extends Date ? K : never;
  }[keyof T],
  string
>;

interface DataReaderOptions<M extends typeof Model> {
  range: [Date, Date];
  dateField: DateField<InstanceType<M>>;
  bufferSize: number;
  onQuery?: (query: Query<M>) => void;
  desc?: boolean;
  exclude?: string[];
}

class DataReader<M extends typeof Model> implements Reader<InstanceType<M>> {
  private range: [Date, Date];
  private dateField: DateField<InstanceType<M>>;
  private bufferSize: number;
  private onQuery?: (query: Query<M>) => void;
  private desc?: boolean;
  private exclude: string[];

  private buffer: any[] = [];
  private pos = 0;
  private done = false;

  constructor(private model: M, options: DataReaderOptions<M>) {
    this.range = options.range;
    this.dateField = options.dateField;
    this.bufferSize = options.bufferSize;
    this.onQuery = options.onQuery;
    this.desc = options.desc;
    this.exclude = options.exclude || [];
  }

  async peek(): Promise<InstanceType<M> | undefined> {
    if (!this.done && this.pos === this.buffer.length) {
      const query = new QueryBuilder(this.model);
      this.onQuery?.(query);
      query.where(this.dateField, '>=', this.range[0]);
      query.where(this.dateField, '<=', this.range[1]);
      if (this.exclude.length) {
        query.where('objectId', 'not-in', this.exclude);
      }
      query.orderBy(this.dateField, this.desc ? 'desc' : 'asc');
      query.limit(this.bufferSize);
      const values = await query.find({ useMasterKey: true });
      this.buffer = values;
      this.pos = 0;
      this.done = values.length < this.bufferSize;
      if (values.length) {
        const lastDate = values[values.length - 1][this.dateField] as Date;
        this.exclude = values
          .filter((v) => isEqual(v[this.dateField] as Date, lastDate))
          .map((v) => v.id);
        if (this.desc) {
          this.range = [this.range[0], lastDate];
        } else {
          this.range = [lastDate, this.range[1]];
        }
      }
    }
    if (this.pos < this.buffer.length) {
      return this.buffer[this.pos];
    }
  }

  async read() {
    const value = await this.peek();
    if (value) {
      this.pos += 1;
      return value;
    }
  }
}

class MapReader<T, U> implements Reader<U> {
  constructor(private reader: Reader<T>, private transfrom: (value: T) => U) {}

  async peek() {
    const value = await this.reader.peek();
    if (value) {
      return this.transfrom(value);
    }
  }

  async read() {
    const value = await this.reader.read();
    if (value) {
      return this.transfrom(value);
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

function convertReplyToActionLog(reply: Reply): CustomerServiceActionLog {
  return {
    id: reply.id,
    type: CustomerServiceActionLogType.Reply,
    operatorId: reply.authorId,
    reply,
    ts: reply.createdAt,
  };
}

function convertReplyRevisionToActionLog(rv: ReplyRevision): CustomerServiceActionLog {
  return {
    id: rv.id,
    type: CustomerServiceActionLogType.Reply,
    operatorId: rv.operatorId,
    reply: rv.reply,
    revision: rv,
    ts: rv.actionTime,
  };
}

function convertOpsLogToActionLog(opsLog: OpsLog): CustomerServiceActionLog {
  return {
    id: opsLog.id,
    type: CustomerServiceActionLogType.OpsLog,
    operatorId: opsLog.data.operator.objectId,
    opsLog,
    ts: opsLog.createdAt,
  };
}

export class CustomerServiceActionLogService {
  async getLogs(options: GetCustomerServiceActionLogsOptions) {
    const { from, to, limit = 10, desc, operatorIds, exclude } = options;
    const perCount = limit <= 100 ? limit : Math.min(Math.floor(limit / 2), 1000);

    const operatorPointers = operatorIds?.map(User.ptr.bind(User));

    const replyReader = new DataReader(Reply, {
      range: [from, to],
      dateField: 'createdAt',
      bufferSize: perCount,
      onQuery: (query) => {
        query.where('isCustomerService', '==', true);
        if (operatorPointers) {
          query.where('author', 'in', operatorPointers);
        }
      },
      desc,
      exclude,
    });

    const replyRevisionReader = new DataReader(ReplyRevision, {
      range: [from, to],
      dateField: 'actionTime',
      bufferSize: perCount,
      onQuery: (query) => {
        query.where('action', 'in', ['update', 'delete']);
        if (operatorPointers) {
          query.where('operator', 'in', operatorPointers);
        }
        query.preload('reply');
      },
      desc,
      exclude,
    });

    const opsLogReader = new DataReader(OpsLog, {
      range: [from, to],
      dateField: 'createdAt',
      bufferSize: perCount,
      onQuery: (query) => {
        if (operatorIds) {
          query.where('data.operator.objectId', 'in', operatorIds);
        } else {
          query.where('data.operator.objectId', 'exists');
          query.where('data.operator.objectId', '!=', 'system');
        }
      },
      desc,
      exclude,
    });

    const replyLogReader = new MapReader(replyReader, convertReplyToActionLog);
    const replyRevisionLogReader = new MapReader(
      replyRevisionReader,
      convertReplyRevisionToActionLog
    );
    const opsLogLogReader = new MapReader(opsLogReader, convertOpsLogToActionLog);

    const sortReader = new SortReader(
      [replyLogReader, replyRevisionLogReader, opsLogLogReader],
      desc ? (a, b) => b.ts.getTime() - a.ts.getTime() : (a, b) => a.ts.getTime() - b.ts.getTime()
    );

    return take(sortReader, limit);
  }
}

export const customerServiceActionLogService = new CustomerServiceActionLogService();
