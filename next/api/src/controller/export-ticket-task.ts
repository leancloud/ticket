import { Context } from 'koa';

import { Controller, Ctx, Get, Query, ResponseBody, UseMiddlewares } from '@/common/http';
import { ParseIntPipe } from '@/common/pipe';
import { adminOnly, auth } from '@/middleware';
import { ExportTicketTask } from '@/model/ExportTicketTask';
import { ExportTicketTaskResponse } from '@/response/export-ticket-task';

@Controller('export-ticket-tasks')
@UseMiddlewares(auth, adminOnly)
export class ExportTicketTaskController {
  @Get()
  @ResponseBody(ExportTicketTaskResponse)
  async getTasks(
    @Ctx() ctx: Context,
    @Query('page', new ParseIntPipe({ min: 1 })) page = 1,
    @Query('pageSize', new ParseIntPipe({ min: 1, max: 100 })) pageSize = 10
  ) {
    const [tasks, totalCount] = await ExportTicketTask.queryBuilder()
      .preload('operator')
      .paginate(page, pageSize)
      .orderBy('createdAt', 'desc')
      .findAndCount({ useMasterKey: true });
    ctx.set('X-Total-Count', totalCount.toString());
    return tasks;
  }
}
