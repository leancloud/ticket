import { http } from '@/leancloud';
import { ReplyRevision, ReplySchema } from './reply';
import { OpsLog, TicketSchema } from './ticket';
import { UserSchema } from './user';

export type CustomerServiceActionLog =
  | {
      id: string;
      type: 'reply';
      ticketId?: string;
      operatorId: string;
      revision: ReplyRevision;
      ts: string;
    }
  | {
      id: string;
      type: 'opsLog';
      ticketId: string;
      operatorId: string;
      opsLog: OpsLog;
      ts: string;
    };

export interface GetCustomerServiceActionLogsOptions {
  from: string;
  to: string;
  operatorIds?: string[];
  pageSize?: number;
  desc?: boolean;
}

export interface GetCustomerServiceActionLogsResult {
  logs: CustomerServiceActionLog[];
  tickets: TicketSchema[];
  replies: ReplySchema[];
  users: UserSchema[];
}

export async function getCustomerServiceActionLogs({
  from,
  to,
  operatorIds,
  pageSize,
  desc,
}: GetCustomerServiceActionLogsOptions) {
  const res = await http.get<GetCustomerServiceActionLogsResult>(
    '/api/2/customer-service-action-logs',
    {
      params: {
        from,
        to,
        operatorIds: operatorIds?.join(','),
        pageSize,
        desc,
      },
    }
  );
  return res.data;
}
