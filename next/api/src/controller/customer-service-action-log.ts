import { BadRequestError, Controller, Get, Query, UseMiddlewares } from '@/common/http';
import { ParseBoolPipe, ParseCsvPipe, ParseDatePipe, ParseIntPipe } from '@/common/pipe';
import { adminOnly, auth } from '@/middleware';
import {
  customerServiceActionLogService,
  CustomerServiceActionLogType,
} from '@/service/customer-service-action-log';
import { Ticket } from '@/model/Ticket';
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
    @Query('pageSize', new ParseIntPipe({ min: 1, max: 100 })) pageSize = 10,
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
    const userIds = new Set<string>();

    const logResult = logs.map((log) => {
      switch (log.type) {
        case CustomerServiceActionLogType.Reply:
          if (log.ticketId) {
            ticketIds.add(log.ticketId);
          }
          userIds.add(log.operatorId);
          return {
            type: 'reply',
            ticketId: log.ticketId,
            operatorId: log.operatorId,
            reply: log.reply && new ReplyResponse(log.reply),
            revision: new ReplyRevisionResponse(log.revision),
            ts: log.ts.toISOString(),
          };
        case CustomerServiceActionLogType.OpsLog:
          ticketIds.add(log.ticketId);
          userIds.add(log.operatorId);
          if (log.opsLog.data.assignee) {
            userIds.add(log.opsLog.data.assignee.objectId);
          }
          return {
            type: 'opsLog',
            ticketId: log.ticketId,
            operatorId: log.operatorId,
            opsLog: new OpsLogResponse(log.opsLog),
            ts: log.ts.toISOString(),
          };
      }
    });

    const tickets = ticketIds.size
      ? await Ticket.queryBuilder()
          .where('objectId', 'in', Array.from(ticketIds))
          .find({ useMasterKey: true })
      : [];

    const users = userIds.size
      ? await User.queryBuilder()
          .where('objectId', 'in', Array.from(userIds))
          .find({ useMasterKey: true })
      : [];

    return {
      logs: logResult,
      tickets: tickets.map((ticket) => new TicketListItemResponse(ticket)),
      users: users.map((user) => new UserResponse(user)),
    };
  }
}
