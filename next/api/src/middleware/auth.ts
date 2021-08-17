import type { Middleware } from 'koa';

import { User } from '../model/user';

export const auth: Middleware = async (ctx, next) => {
  const sessionToken = ctx.get('X-LC-Session');
  if (sessionToken) {
    try {
      ctx.state.currentUser = await User.findBySessionToken(sessionToken);
    } catch (error) {
      if (error.code === 211) {
        ctx.throw(403);
      }
      throw error;
    }
    return next();
  }
  const anonymousId = ctx.get('X-Anonymous-ID');
  if (anonymousId) {
    const user = await User.query()
      .where('authData.anonymous.id', '==', anonymousId)
      .first({ useMasterKey: true });
    if (!user) {
      console.log('x-anonymous-id user not found');
      return ctx.throw(401);
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
