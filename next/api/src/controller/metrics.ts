import { Context } from 'koa';
import { z } from 'zod';
import { Controller, Ctx, Get, HttpError, Query, UseMiddlewares } from '@/common/http';
import {
  Order,
  ParseDatePipe,
  ParseIntPipe,
  ParseOrderPipe,
  ZodValidationPipe,
} from '@/common/pipe';
import { DurationMetrics } from '@/model/DurationMetrics';
import { auth, adminOnly } from '@/middleware';
import { TicketResponse } from '@/response/ticket';

const parseOrderByPipe = new ParseOrderPipe([
  'firstReplyTime',
  'agentWaitTime',
  'requesterWaitTime',
  'firstResolutionTime',
  'fullResolutionTime',
]);

const validateRangePipe = new ZodValidationPipe(
  z
    .string()
    .regex(/^(\d+|\*)\.\.(\d+|\*)$/)
    .optional()
);

@Controller('metrics')
@UseMiddlewares(auth, adminOnly)
export class MetricsController {
  @Get('duration')
  async getDurationMetrics(
    @Ctx() ctx: Context,
    @Query('from', ParseDatePipe) from: Date | undefined,
    @Query('to', ParseDatePipe) to: Date | undefined,
    @Query('orderBy', parseOrderByPipe) orderBy: Order[] | undefined,
    @Query('page', new ParseIntPipe({ min: 1 })) page = 1,
    @Query('pageSize', new ParseIntPipe({ min: 0, max: 100 })) pageSize = 10,
    @Query('firstReplyTime', validateRangePipe) firstReplyTime: string | undefined,
    @Query('agentWaitTime', validateRangePipe) agentWaitTime: string | undefined,
    @Query('requesterWaitTime', validateRangePipe) requesterWaitTime: string | undefined,
    @Query('firstResolutionTime', validateRangePipe) firstResolutionTime: string | undefined,
    @Query('fullResolutionTime', validateRangePipe) fullResolutionTime: string | undefined
  ) {
    if (!from) {
      throw new HttpError(400, 'from is required');
    }
    if (!to) {
      throw new HttpError(400, 'to is required');
    }

    const ranges = {
      firstReplyTime,
      agentWaitTime,
      requesterWaitTime,
      firstResolutionTime,
      fullResolutionTime,
    };

    const qb = DurationMetrics.queryBuilder()
      .where('ticketCreatedAt', '>=', from)
      .where('ticketCreatedAt', '<', to)
      .paginate(page, pageSize)
      .preload('ticket');

    Object.entries(ranges).forEach(([key, range]) => {
      if (!range) {
        return;
      }
      const [min, max] = range.split('..');
      if (min !== '*') {
        qb.where(key, '>=', parseInt(min));
      }
      if (max !== '*') {
        qb.where(key, '<=', parseInt(max));
      }
    });

    if (orderBy && orderBy.length) {
      orderBy.forEach(({ key, order }) => {
        qb.orderBy(key, order);
        qb.where(key, 'exists');
      });
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
