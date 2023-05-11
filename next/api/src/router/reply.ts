import Router from '@koa/router';
import { z } from 'zod';
import _ from 'lodash';

import { auth, customerServiceOnly } from '@/middleware';
import htmlify from '@/utils/htmlify';
import { UpdateData } from '@/orm';
import { Reply } from '@/model/Reply';
import { User } from '@/model/User';

const router = new Router().use(auth, customerServiceOnly);

router.param('id', async (id, ctx, next) => {
  const currentUser = ctx.state.currentUser as User;
  const reply = await Reply.find(id, currentUser.getAuthOptions());
  if (!reply) {
    ctx.throw(404);
  }
  ctx.state.reply = reply;
  return next();
});

const updateReplyDataSchema = z.object({
  content: z.string().optional(),
  fileIds: z.array(z.string()).optional(),
});

router.patch('/:id', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const reply = ctx.state.reply as Reply;
  const { content, fileIds } = updateReplyDataSchema.parse(ctx.request.body);

  if (!content && (!fileIds || fileIds.length === 0)) {
    ctx.throw(400, 'content and fileIds cannot be empty at the same time');
  }

  if (!(await canUpdateReply(currentUser, reply))) {
    ctx.throw(403, `you have no privilege to update reply ${reply.id}`);
  }

  const updateData: UpdateData<Reply> = {};
  if (content !== undefined) {
    updateData.content = content;
    updateData.contentHTML = htmlify(content);
  }
  if (fileIds) {
    updateData.fileIds = fileIds.length ? fileIds : null;
  }

  if (!_.isEmpty(updateData)) {
    await reply.update(updateData, { useMasterKey: true });
  }

  ctx.body = {};
});

router.delete('/:id', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const reply = ctx.state.reply as Reply;

  if (!(await canUpdateReply(currentUser, reply))) {
    ctx.throw(403, `you have no privilege to delete reply ${reply.id}`);
  }

  await reply.update({ deletedAt: new Date() }, { useMasterKey: true });
  // 同时修改 ACL 会导致 LiveQuery 无法收到更新
  await reply.update({ ACL: {} }, { useMasterKey: true });

  ctx.body = {};
});

async function canUpdateReply(user: User, reply: Reply) {
  if (user.id === reply.authorId) {
    return true;
  }
  if (await User.isCustomerService(reply.authorId)) {
    // 允许客服之间互相修改回复
    return true;
  }
  return false;
}

export default router;
