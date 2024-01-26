import _ from 'lodash';

import { BadRequestError, Controller, Get, Query, UseMiddlewares } from '@/common/http';
import { ParseBoolPipe, ParseCsvPipe, ParseDatePipe, ParseIntPipe } from '@/common/pipe';
import { adminOnly, auth } from '@/middleware';
import {
  CustomerServiceActionLogType,
  customerServiceActionLogService,
} from '@/service/customer-service-action-log';
import { Ticket } from '@/model/Ticket';
import { Reply } from '@/model/Reply';
import { User } from '@/model/User';
import { OpsLogResponse } from '@/response/ops-log';
import { ReplyResponse } from '@/response/reply';
import { ReplyRevisionResponse } from '@/response/reply-revision';
import { TicketListItemResponse } from '@/response/ticket';
import { UserResponse } from '@/response/user';

@Controller('customer-service-action-logs')
@UseMiddlewares(auth, adminOnly)
export class CustomerServiceActionLogController {
  @Get()
  async getLogs(
    @Query('from', ParseDatePipe) from: Date | undefined,
    @Query('to', ParseDatePipe) to: Date | undefined,
    @Query('operatorIds', ParseCsvPipe) operatorIds: string[] | undefined,
    @Query('pageSize', new ParseIntPipe({ min: 1, max: 1000 })) pageSize = 10,
    @Query('desc', ParseBoolPipe) desc: boolean | undefined
  ) {
    if (!from || !to) {
      throw new BadRequestError('Date range params "from" and "to" are required');
    }
    if (operatorIds && operatorIds.length > 20) {
      throw new BadRequestError('The size of operatorIds must less than 20');
    }

    const logs = await customerServiceActionLogService.getLogs({
      from,
      to,
      operatorIds,
      limit: pageSize,
      desc,
    });

    const ticketIds = new Set<string>();
    const replyIds = new Set<string>();
    const userIds = new Set<string>();

    for (const log of logs) {
      switch (log.type) {
        case CustomerServiceActionLogType.Reply:
          replyIds.add(log.revision.replyId);
          userIds.add(log.operatorId);
          break;
        case CustomerServiceActionLogType.OpsLog:
          ticketIds.add(log.opsLog.ticketId);
          userIds.add(log.operatorId);
          if (log.opsLog.data.assignee) {
            userIds.add(log.opsLog.data.assignee);
          }
          break;
      }
    }

    const replies = await Reply.getMany(Array.from(replyIds), { useMasterKey: true });

    for (const reply of replies) {
      ticketIds.add(reply.ticketId);
    }

    const tickets = await Ticket.getMany(Array.from(ticketIds), { useMasterKey: true });
    const users = await User.getMany(Array.from(userIds), { useMasterKey: true });

    const replyById = _.keyBy(replies, (r) => r.id);
    const ticketById = _.keyBy(tickets, (t) => t.id);

    const logResult = logs.map((log) => {
      switch (log.type) {
        case CustomerServiceActionLogType.Reply:
          const reply = replyById[log.revision.replyId];
          const ticket = reply && ticketById[reply.ticketId];
          return {
            id: log.id,
            type: 'reply',
            ticketId: ticket?.id,
            operatorId: log.operatorId,
            revision: new ReplyRevisionResponse(log.revision),
            ts: log.ts.toISOString(),
          };
        case CustomerServiceActionLogType.OpsLog:
          return {
            id: log.id,
            type: 'opsLog',
            ticketId: log.opsLog.ticketId,
            operatorId: log.operatorId,
            opsLog: new OpsLogResponse(log.opsLog),
            ts: log.ts.toISOString(),
          };
      }
    });

    return {
      logs: logResult,
      tickets: tickets.map((ticket) => new TicketListItemResponse(ticket)),
      replies: replies.map((reply) => new ReplyResponse(reply)),
      users: users.map((user) => new UserResponse(user)),
    };
  }
}
