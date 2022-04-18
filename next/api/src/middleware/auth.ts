import type { Middleware } from 'koa';

import { User } from '@/model/User';

export const auth: Middleware = async (ctx, next) => {
  const sessionToken = ctx.get('X-LC-Session');
  if (sessionToken) {
    try {
      ctx.state.currentUser = await User.findBySessionToken(sessionToken);
    } catch (error: any) {
      if (error.code === 211) {
        ctx.throw(401, '无效的用户凭证，请重新登录。', {
          code: 'INVALID_SESSION_TOKEN',
        });
      }
      throw error;
    }
    return next();
  }

  const anonymousId = ctx.get('X-Anonymous-ID');
  if (anonymousId) {
    const user = await User.findByAnonymousId(anonymousId);
    if (!user) {
      ctx.throw(401, '未找到该 Anonymous ID 对应的用户，该用户可能从未使用过客服功能。', {
        code: 'INVALID_ANONYMOUS_ID',
      });
    }
    ctx.state.currentUser = user;
    return next();
  }

  ctx.throw(401, '缺少用户凭证。', { code: 'CREDENTIAL_REQUIRED' });
};

export const customerServiceOnly: Middleware = async (ctx, next) => {
  const currentUser = ctx.state.currentUser as User;
  if (!currentUser) {
    ctx.throw(401);
  }
  if (!(await currentUser.isCustomerService())) {
    ctx.throw(403);
  }
  return next();
};

export const staffOnly: Middleware = async (ctx, next) => {
  const currentUser = ctx.state.currentUser as User;
  if (!currentUser) {
    ctx.throw(401);
  }
  if (await currentUser.isCustomerService()) {
    return next();
  }
  if (await currentUser.isStaff()) {
    return next();
  }
  return ctx.throw(403);
};
