import { Context } from 'koa';
import { Controller, Ctx, Get, HttpError, Query, UseMiddlewares } from '@/common/http';
import { Order, ParseDatePipe, ParseIntPipe, ParseOrderPipe } from '@/common/pipe';
import { DurationMetrics } from '@/model/DurationMetrics';
import { auth, customerServiceOnly } from '@/middleware';
import { TicketResponse } from '@/response/ticket';

const PARSE_ORDER_PIPE = new ParseOrderPipe([
  'firstReplyTime',
  'agentWaitTime',
  'requesterWaitTime',
  'firstResolutionTime',
  'fullResolutionTime',
]);

@Controller('metrics')
@UseMiddlewares(auth, customerServiceOnly)
export class MetricsController {
  @Get('duration')
  async getDurationMetrics(
    @Ctx() ctx: Context,
    @Query('from', ParseDatePipe) from: Date | undefined,
    @Query('to', ParseDatePipe) to: Date | undefined,
    @Query('orderBy', PARSE_ORDER_PIPE) orderBy: Order[] | undefined,
    @Query('page', new ParseIntPipe({ min: 1 })) page = 1,
    @Query('pageSize', new ParseIntPipe({ min: 0, max: 100 })) pageSize = 10
  ) {
    if (!from) {
      throw new HttpError(400, 'from is required');
    }
    if (!to) {
      throw new HttpError(400, 'to is required');
    }

    const qb = DurationMetrics.queryBuilder()
      .where('ticketCreatedAt', '>=', from)
      .where('ticketCreatedAt', '<', to)
      .paginate(page, pageSize)
      .preload('ticket');

    if (orderBy && orderBy.length) {
      orderBy.forEach(({ key, order }) => qb.orderBy(key, order));
    } else {
      qb.orderBy('ticketCreatedAt', 'desc');
    }

    const [durationMetrics, totalCount] = await qb.findAndCount({ useMasterKey: true });

    ctx.set('X-Total-Count', totalCount.toString());

    return durationMetrics.map((dm) => ({
      id: dm.id,
      ticket: dm.ticket ? new TicketResponse(dm.ticket) : undefined,
      firstReplyTime: dm.firstReplyTime,
      firstResolutionTime: dm.firstResolutionTime,
      fullResolutionTime: dm.fullResolutionTime,
      requesterWaitTime: dm.requesterWaitTime,
      agentWaitTime: dm.agentWaitTime,
    }));
  }
}
