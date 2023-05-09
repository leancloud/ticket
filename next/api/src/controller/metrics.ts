import { Context } from 'koa';
import { Controller, Ctx, Get, HttpError, Query, UseMiddlewares } from '@/common/http';
import { Order, ParseDatePipe, ParseIntPipe, ParseOrderPipe } from '@/common/pipe';
import { DurationMetric } from '@/model/DurationMetric';
import { auth, customerServiceOnly } from '@/middleware';

const PARSE_ORDER_PIPE = new ParseOrderPipe([
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

    const qb = DurationMetric.queryBuilder()
      .where('createdAt', '>=', from)
      .where('createdAt', '<', to)
      .paginate(page, pageSize);

    orderBy?.forEach(({ key, order }) => qb.orderBy(key, order));

    const [durationMetrics, totalCount] = await qb.findAndCount({ useMasterKey: true });

    ctx.set('X-Total-Count', totalCount.toString());

    return durationMetrics.map((dm) => ({
      ticketId: dm.ticketId,
      firstReplyTime: dm.firstReplyTime,
      firstResolutionTime: dm.firstResolutionTime,
      fullResolutionTime: dm.fullResolutionTime,
      requesterWaitTime: dm.requesterWaitTime,
      agentWaitTime: dm.agentWaitTime,
      createdAt: dm.createdAt,
    }));
  }
}
