import { z } from 'zod';

import {
  Body,
  Controller,
  CurrentUser,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { FindModelPipe, ZodValidationPipe } from '@/common/pipe';
import { auth, customerServiceOnly } from '@/middleware';
import { ACLBuilder } from '@/orm';
import { User } from '@/model/User';
import { QuickReply } from '@/model/QuickReply';
import { QuickReplyResponse } from '@/response/quick-reply';

const createQuickReplySchema = z.object({
  name: z.string(),
  content: z.string(),
  fileIds: z.array(z.string()).optional(),
  userId: z.string(),
});

const updateQuickReplySchema = createQuickReplySchema
  .extend({
    userId: z.string().nullable(),
  })
  .partial();

type CreateQuickReplyData = z.infer<typeof createQuickReplySchema>;

type UpdateQuickReplyData = z.infer<typeof updateQuickReplySchema>;

@Controller('quick-replies')
@UseMiddlewares(auth, customerServiceOnly)
export class QuickReplyController {
  @Post()
  async create(
    @CurrentUser() currentUser: User,
    @Body(new ZodValidationPipe(createQuickReplySchema)) data: CreateQuickReplyData
  ) {
    const ACL = new ACLBuilder().allowCustomerService('read', 'write');
    const quickReply = await QuickReply.create(
      {
        ...data,
        ACL,
      },
      currentUser.getAuthOptions()
    );
    return {
      id: quickReply.id,
    };
  }

  @Get()
  @ResponseBody(QuickReplyResponse)
  findSome(@CurrentUser() currentUser: User, @Query('userId') userId: string | undefined) {
    const query = QuickReply.queryBuilder();
    if (userId) {
      if (userId === 'null') {
        query.where('owner', 'not-exists');
      } else {
        query.where('owner', '==', User.ptr(userId));
      }
    }
    return query.find(currentUser.getAuthOptions());
  }

  @Get(':id')
  @ResponseBody(QuickReplyResponse)
  findOne(@Param('id', new FindModelPipe(QuickReply)) quickReply: QuickReply) {
    return quickReply;
  }

  @Patch(':id')
  async update(
    @CurrentUser() currentUser: User,
    @Param('id', new FindModelPipe(QuickReply)) quickReply: QuickReply,
    @Body(new ZodValidationPipe(updateQuickReplySchema)) data: UpdateQuickReplyData
  ) {
    await quickReply.update(data, currentUser.getAuthOptions());
    return {};
  }

  @Delete(':id')
  async delete(
    @CurrentUser() currentUser: User,
    @Param('id', new FindModelPipe(QuickReply)) quickReply: QuickReply
  ) {
    await quickReply.delete(currentUser.getAuthOptions());
    return {};
  }
}
