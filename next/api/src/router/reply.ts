import Router from '@koa/router';
import { z } from 'zod';
import _ from 'lodash';

import { auth, customerServiceOnly } from '@/middleware';
import htmlify from '@/utils/htmlify';
import { CreateData, UpdateData } from '@/orm';
import { Reply } from '@/model/Reply';
import { User } from '@/model/User';
import { ReplyRevision } from '@/model/ReplyRevision';
import { ReplyRevisionResponse } from '@/response/reply-revision';
import { ReplyResponse } from '@/response/reply';

const router = new Router().use(auth, customerServiceOnly);

router.param('id', async (id, ctx, next) => {
  const reply = await Reply.find(id, { useMasterKey: true });
  if (!reply) {
    ctx.throw(404);
  }
  ctx.state.reply = reply;
  return next();
});

const updateReplyDataSchema = z.object({
  content: z
    .string()
    .transform((content) => content.trim())
    .optional(),
  fileIds: z.array(z.string()).optional(),
});

router.patch('/:id', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const reply = ctx.state.reply as Reply;
  const { content, fileIds } = updateReplyDataSchema.parse(ctx.request.body);

  if (!(await canUpdateReply(currentUser, reply))) {
    ctx.throw(403, `you have no privilege to update reply ${reply.id}`);
  }

  if (content === '' && fileIds?.length === 0) {
    ctx.throw(400, 'content and fileIds cannot be empty at the same time');
  }

  if (content === undefined && !fileIds) {
    ctx.body = new ReplyResponse(reply);
    return;
  }

  const updateData: UpdateData<Reply> = {
    edited: true,
  };
  if (content !== undefined) {
    updateData.content = content;
    updateData.contentHTML = htmlify(content);
  }
  if (fileIds) {
    updateData.fileIds = fileIds.length ? fileIds : null;
  }

  const newReply = await reply.update(updateData, { useMasterKey: true });

  const revisionDatas: CreateData<ReplyRevision>[] = [];

  if (!reply.edited) {
    revisionDatas.push({
      ACL: {},
      replyId: reply.id,
      content: reply.content,
      contentHTML: reply.contentHTML,
      fileIds: reply.fileIds,
      operatorId: reply.authorId,
      action: 'create',
      actionTime: reply.createdAt,
    });
  }

  revisionDatas.push({
    ACL: {},
    replyId: reply.id,
    content: newReply.content,
    contentHTML: newReply.contentHTML,
    fileIds: newReply.fileIds,
    operatorId: currentUser.id,
    action: 'update',
    actionTime: newReply.updatedAt,
  });

  await ReplyRevision.createSome(revisionDatas, { useMasterKey: true });

  ctx.body = new ReplyResponse(newReply);
});

router.delete('/:id', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const reply = ctx.state.reply as Reply;

  if (!(await canUpdateReply(currentUser, reply))) {
    ctx.throw(403, `you have no privilege to delete reply ${reply.id}`);
  }

  const newReply = await reply.update(
    {
      edited: true,
      deletedAt: new Date(),
    },
    { useMasterKey: true }
  );
  // 同时修改 ACL 会导致 LiveQuery 无法收到更新
  await reply.update({ ACL: {} }, { useMasterKey: true });

  const revisionDatas: CreateData<ReplyRevision>[] = [];

  if (!reply.edited) {
    revisionDatas.push({
      ACL: {},
      replyId: reply.id,
      content: reply.content,
      contentHTML: reply.contentHTML,
      fileIds: reply.fileIds,
      operatorId: reply.authorId,
      action: 'create',
      actionTime: reply.createdAt,
    });
  }

  revisionDatas.push({
    ACL: {},
    replyId: reply.id,
    content: reply.content,
    contentHTML: reply.contentHTML,
    fileIds: reply.fileIds,
    operatorId: currentUser.id,
    action: 'delete',
    actionTime: newReply.deletedAt,
  });

  await ReplyRevision.createSome(revisionDatas, { useMasterKey: true });

  ctx.body = {};
});

async function canUpdateReply(user: User, reply: Reply) {
  if (user.id === reply.authorId) {
    return true;
  }
  if (await User.isCustomerService(reply.authorId)) {
    // 允许客服修改其他客服的回复
    return true;
  }
  return false;
}

router.get('/:id/revisions', async (ctx) => {
  const reply = ctx.state.reply as Reply;
  const revisions = await ReplyRevision.queryBuilder()
    .preload('operator')
    .preload('files')
    .where('reply', '==', reply.toPointer())
    .orderBy('createdAt')
    .find({ useMasterKey: true });
  ctx.body = revisions.map((revision) => new ReplyRevisionResponse(revision));
});

export default router;
