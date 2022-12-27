import type { Middleware } from 'koa';

import { User } from '@/model/User';
import { withAsyncSpan, withSpan } from '@/utils/trace';
import { getVerifiedPayload } from '@/utils/jwt';

const { ENABLE_TDS_USER_LOGIN } = process.env;

export const auth: Middleware = withSpan(async (ctx, next) => {
  const sessionToken = ctx.get('X-LC-Session');
  if (sessionToken) {
    try {
      ctx.state.currentUser = await withAsyncSpan(
        () => User.findBySessionToken(sessionToken),
        ctx,
        'model',
        `User.findBySessionToken(${sessionToken})`
      );
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
    if (anonymousId.length < 32) {
      ctx.throw(401, 'Anonymous ID 长度不足', {
        code: 'WEAK_ANONYMOUS_ID',
      });
    }
    const user = await withAsyncSpan(
      () => User.findByAnonymousId(anonymousId),
      ctx,
      'model',
      `User.findByAnonymousId(${anonymousId})`
    );
    if (!user) {
      ctx.throw(401, '未找到该 Anonymous ID 对应的用户，该用户可能从未使用过客服功能。', {
        code: 'USER_NOT_REGISTERED',
      });
    }
    ctx.state.currentUser = user;
    return next();
  }

  const tdsUserToken = ctx.get('X-TDS-Credential');
  if (tdsUserToken && ENABLE_TDS_USER_LOGIN) {
    const user = await withAsyncSpan(
      () => User.findByTDSUserToken(tdsUserToken),
      ctx,
      'model',
      `User.findByTDSUserJWT(${tdsUserToken})`
    );

    if (!user) {
      ctx.throw(401, '未找到该 TDS Token 对应的用户，该用户可能从未使用过客服功能。', {
        code: 'USER_NOT_REGISTERED',
      });
    }

    ctx.state.currentUser = user;
    return next();
  }

  const token = ctx.get('X-Credential');
  if (token) {
    const { sub } = getVerifiedPayload(token);
    if (sub === undefined) {
      return ctx.throw(401, 'sub field is required', {
        code: 'INVALID_TOKEN',
      });
    }

    const user = await User.findByUsername(sub);

    if (!user) {
      ctx.throw(401, '未找到该 Token 对应的用户，该用户可能从未使用过客服功能。', {
        code: 'USER_NOT_REGISTERED',
      });
    }

    ctx.state.currentUser = user;
    return next();
  }

  ctx.throw(401, '缺少用户凭证。', { code: 'CREDENTIAL_REQUIRED' });
}, 'auth');

export const customerServiceOnly: Middleware = withSpan(async (ctx, next) => {
  const currentUser = ctx.state.currentUser as User;
  if (!currentUser) {
    ctx.throw(401);
  }
  if (!(await currentUser.isCustomerService())) {
    ctx.throw(403);
  }
  return next();
}, 'customerServiceOnly');

export const staffOnly: Middleware = withSpan(async (ctx, next) => {
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
}, 'staffOnly');
