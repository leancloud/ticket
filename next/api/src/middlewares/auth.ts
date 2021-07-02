import Koa from 'koa';
import AV from 'leancloud-storage';

import { LoggedInUser } from '../models/user';

export default async function auth(ctx: Koa.Context, next: Koa.Next) {
  const sessionToken = ctx.get('X-LC-Session');
  if (!sessionToken) {
    ctx.throw(401);
  }
  try {
    const avUser = await AV.User.become(sessionToken);
    ctx.state.user = new LoggedInUser(avUser);
  } catch (error) {
    if (error.code === 211) {
      ctx.throw(403);
    }
    throw error;
  }
  return next();
}
