import type { Middleware } from 'koa';

import { User } from '../models/user';

export const auth: Middleware = async (ctx, next) => {
  const sessionToken = ctx.get('X-LC-Session');
  if (!sessionToken) {
    ctx.throw(401);
  }
  try {
    ctx.state.currentUser = await User.getBySessionToken(sessionToken);
  } catch (error) {
    if (error.code === 211) {
      ctx.throw(403);
    }
    throw error;
  }
  return next();
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
