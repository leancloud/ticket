import { Context } from 'koa';
import _ from 'lodash';

import {
  BadRequestError,
  Controller,
  Ctx,
  Get,
  Pagination,
  Query,
  UseMiddlewares,
} from '@/common/http';
import { ParseDatePipe } from '@/common/pipe';
import { auth, customerServiceOnly } from '@/middleware';
import { Reply } from '@/model/Reply';
import { User } from '@/model/User';
import { OpsLog } from '@/model/OpsLog';

@Controller('verification')
@UseMiddlewares(auth, customerServiceOnly)
export class VerificationController {
  @Get('reply')
  async getReplyVerification(
    @Ctx() ctx: Context,
    @Query('userId') userId: string | undefined,
    @Query('from', ParseDatePipe) from: Date | undefined,
    @Query('to', ParseDatePipe) to: Date | undefined,
    @Pagination() [page, pageSize]: [number, number]
  ) {
    if (!userId) {
      throw new BadRequestError(`query.userId is required`);
    }

    const query = Reply.queryBuilder();
    query.where('author', '==', User.ptr(userId));
    if (from) {
      query.where('createdAt', '>=', from);
    }
    if (to) {
      query.where('createdAt', '<=', to);
    }
    query.preload('ticket');
    query.orderBy('createdAt');
    query.paginate(page, pageSize);
    const [replies, count] = await query.findAndCount({ useMasterKey: true });

    ctx.set('x-total-count', count.toString());

    return replies.map((reply) => ({
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      ticket: reply.ticket && _.pick(reply.ticket, ['id', 'nid', 'title', 'content', 'createdAt']),
    }));
  }

  @Get('operation')
  async getOperationVerification(
    @Ctx() ctx: Context,
    @Query('userId') userId: string | undefined,
    @Query('from', ParseDatePipe) from: Date | undefined,
    @Query('to', ParseDatePipe) to: Date | undefined,
    @Pagination() [page, pageSize]: [number, number]
  ) {
    if (!userId) {
      throw new BadRequestError(`query.userId is required`);
    }

    const query = OpsLog.queryBuilder();
    query.where('data.operator.objectId', '==', userId);
    if (from) {
      query.where('createdAt', '>=', from);
    }
    if (to) {
      query.where('createdAt', '<=', to);
    }
    query.preload('ticket');
    query.orderBy('createdAt');
    query.paginate(page, pageSize);
    const [opsLogs, count] = await query.findAndCount({ useMasterKey: true });

    ctx.set('x-total-count', count.toString());

    return opsLogs.map((opsLog) => ({
      id: opsLog.id,
      action: opsLog.action,
      createdAt: opsLog.createdAt,
      ticket:
        opsLog.ticket && _.pick(opsLog.ticket, ['id', 'nid', 'title', 'content', 'createdAt']),
    }));
  }
}
