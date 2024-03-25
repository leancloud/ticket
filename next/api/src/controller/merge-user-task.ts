import { Context } from 'koa';
import { z } from 'zod';

import {
  Body,
  Controller,
  Ctx,
  Get,
  Post,
  Query,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { ParseIntPipe, ZodValidationPipe } from '@/common/pipe';
import { adminOnly, auth } from '@/middleware';
import { userService } from '@/user/services/user';
import { MergeUserTaskResponse } from '@/response/merge-user-task';
import { MergeUserTask } from '@/model/MergeUserTask';

const MergeUserSchema = z.object({
  sourceUserId: z.string(),
  targetUserId: z.string(),
});

@Controller('merge-user-tasks')
@UseMiddlewares(auth, adminOnly)
export class MergeUserTaskController {
  @Post()
  @ResponseBody(MergeUserTaskResponse)
  async createTask(
    @Body(new ZodValidationPipe(MergeUserSchema))
    data: z.infer<typeof MergeUserSchema>
  ) {
    return userService.mergeUser(data.sourceUserId, data.targetUserId);
  }

  @Get()
  @ResponseBody(MergeUserTaskResponse)
  async getTasks(
    @Ctx() ctx: Context,
    @Query('page', new ParseIntPipe({ min: 1 })) page = 1,
    @Query('pageSize', new ParseIntPipe({ min: 1, max: 100 })) pageSize = 10
  ) {
    const [tasks, totalCount] = await MergeUserTask.queryBuilder()
      .preload('sourceUser')
      .preload('targetUser')
      .paginate(page, pageSize)
      .orderBy('createdAt', 'desc')
      .findAndCount({ useMasterKey: true });
    ctx.set('X-Total-Count', totalCount.toString());
    return tasks;
  }
}
