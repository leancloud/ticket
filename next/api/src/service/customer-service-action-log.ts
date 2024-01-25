import _ from 'lodash';

import { OpsLog } from '@/model/OpsLog';
import { Reply } from '@/model/Reply';
import { ReplyRevision } from '@/model/ReplyRevision';
import { User } from '@/model/User';

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
      type: CustomerServiceActionLogType.Reply;
      ticketId?: string;
      operatorId: string;
      reply?: Reply;
      revision: ReplyRevision;
      ts: Date;
    }
  | {
      type: CustomerServiceActionLogType.OpsLog;
      ticketId: string;
      operatorId: string;
      opsLog: OpsLog;
      ts: Date;
    };

function topN<T>(arrays: T[][], N: number, cmp: (v1: T, v2: T) => number): T[] {
  const totalCount = _.sum(arrays.map((array) => array.length));
  const result: T[] = new Array(Math.min(N, totalCount));
  const indices: number[] = new Array(arrays.length).fill(0);

  let resultIndex = 0;

  while (resultIndex < result.length) {
    let minValue: T | null = null;
    let minIndex = -1;

    for (let i = 0; i < arrays.length; i += 1) {
      const array = arrays[i];
      const currentIndex = indices[i];
      if (currentIndex < array.length) {
        const currentValue = array[currentIndex];
        if (!minValue || cmp(currentValue, minValue) <= 0) {
          minValue = currentValue;
          minIndex = i;
        }
      }
    }

    if (minIndex !== -1 && minValue) {
      result[resultIndex] = minValue;
      indices[minIndex] += 1;
      resultIndex += 1;
    } else {
      break; // No more elements to consider
    }
  }

  return result;
}

export class CustomerServiceActionLogService {
  private getReplyRevisions({
    from,
    to,
    operatorIds,
    limit = 10,
    desc,
  }: GetCustomerServiceActionLogsOptions) {
    const query = ReplyRevision.queryBuilder()
      .where('actionTime', '>=', from)
      .where('actionTime', '<=', to)
      .preload('reply')
      .limit(limit)
      .orderBy('actionTime', desc ? 'desc' : 'asc');
    if (operatorIds) {
      query.where('operator', 'in', operatorIds.map(User.ptr.bind(User)));
    }
    return query.find({ useMasterKey: true });
  }

  private getOpsLogs({
    from,
    to,
    operatorIds,
    limit = 10,
    desc,
  }: GetCustomerServiceActionLogsOptions) {
    const query = OpsLog.queryBuilder()
      .where('createdAt', '>=', from)
      .where('createdAt', '<=', to)
      .limit(limit)
      .orderBy('createdAt', desc ? 'desc' : 'asc');
    if (operatorIds) {
      query.where('data.operator.objectId', 'in', operatorIds);
    } else {
      query.where('data.operator.objectId', 'exists');
      query.where('data.operator.objectId', '!=', 'system');
    }
    return query.find({ useMasterKey: true });
  }

  async getLogs(options: GetCustomerServiceActionLogsOptions) {
    const { limit = 10, desc } = options;

    const replyRevisions = await this.getReplyRevisions(options);
    const opsLogs = await this.getOpsLogs(options);

    const replyLogs = replyRevisions.map<CustomerServiceActionLog>((rv) => ({
      type: CustomerServiceActionLogType.Reply,
      ticketId: rv.reply?.ticketId,
      reply: rv.reply,
      revision: rv,
      operatorId: rv.operatorId,
      ts: rv.actionTime,
    }));

    const opsLogLogs = opsLogs.map<CustomerServiceActionLog>((opsLog) => ({
      type: CustomerServiceActionLogType.OpsLog,
      ticketId: opsLog.ticketId,
      opsLog,
      operatorId: opsLog.data.operator.objectId,
      ts: opsLog.createdAt,
    }));

    return topN([replyLogs, opsLogLogs], limit, (a, b) => {
      if (desc) {
        return b.ts.getTime() - a.ts.getTime();
      } else {
        return a.ts.getTime() - b.ts.getTime();
      }
    });
  }
}

export const customerServiceActionLogService = new CustomerServiceActionLogService();
