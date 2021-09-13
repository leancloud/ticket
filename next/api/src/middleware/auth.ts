import type { Middleware } from 'koa';

import { User } from '../model2/User';

export const auth: Middleware = async (ctx, next) => {
  const sessionToken = ctx.get('X-LC-Session');
  if (sessionToken) {
    try {
      ctx.state.currentUser = await User.findBySessionToken(sessionToken);
    } catch (error: any) {
      if (error.code === 211) {
        ctx.throw(403);
      }
      throw error;
    }
    return next();
  }

  const anonymousId = ctx.get('X-Anonymous-ID');
  if (anonymousId) {
    const user = await User.findByAnonymousId(anonymousId);
    if (!user) {
      console.log('x-anonymous-id user not found');
      ctx.throw(403);
    }
    ctx.state.currentUser = user;
    return next();
  }

  ctx.throw(401);
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
