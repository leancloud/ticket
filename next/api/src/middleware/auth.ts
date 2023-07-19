import type { Middleware } from 'koa';

import { transformToHttpError, User, UserNotRegisteredError } from '@/model/User';
import { withAsyncSpan, withSpan } from '@/utils/trace';
import { getVerifiedPayloadWithSubRequired } from '@/utils/jwt';
import { roleService } from '@/service/role';

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
          code: 'INVALID_CREDENTIAL',
          numCode: 9002,
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
        numCode: 9005,
      });
    }
    const user = await withAsyncSpan(
      () => User.findByAnonymousId(anonymousId),
      ctx,
      'model',
      `User.findByAnonymousId(${anonymousId})`
    );
    if (!user) {
      throw new UserNotRegisteredError(
        '未找到该 Anonymous ID 对应的用户，该用户可能从未使用过客服功能。'
      );
    }
    ctx.state.currentUser = user;
    return next();
  }

  const tdsUserToken = ctx.get('X-TDS-Credential');
  if (tdsUserToken && ENABLE_TDS_USER_LOGIN) {
    const user = await withAsyncSpan(
      () => transformToHttpError(() => User.findByTDSUserToken(tdsUserToken)),
      ctx,
      'model',
      `User.findByTDSUserToken(${tdsUserToken})`
    );

    if (!user) {
      throw new UserNotRegisteredError(
        '未找到该 TDS Token 对应的用户，该用户可能从未使用过客服功能。'
      );
    }

    ctx.state.currentUser = user;
    return next();
  }

  const token = ctx.get('X-Credential');
  if (token) {
    const payload = transformToHttpError(() => getVerifiedPayloadWithSubRequired(token));

    const user = await User.findByUsername(payload.sub);

    if (!user) {
      throw new UserNotRegisteredError('未找到该 Token 对应的用户，该用户可能从未使用过客服功能。');
    }

    await user.loadSessionToken();
    ctx.state.currentUser = user;
    return next();
  }

  ctx.throw(401, '缺少用户凭证。', { code: 'CREDENTIAL_REQUIRED', numCode: 9004 });
}, 'auth');

export const adminOnly: Middleware = withSpan(async (ctx, next) => {
  const currentUser = ctx.state.currentUser as User;
  if (!currentUser) {
    ctx.throw(401);
  }
  if (!(await currentUser.isAdmin())) {
    ctx.throw(403);
  }
  return next();
}, 'adminOnly');

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
  if (!(await currentUser.isStaff())) {
    ctx.throw(403);
  }
  return next();
}, 'staffOnly');

export const systemRoleMemberGuard: Middleware = withSpan(async (ctx, next) => {
  const currentUser = ctx.state.currentUser as User;
  if (!currentUser) {
    ctx.throw(401);
  }
  const systemRoles = await roleService.getSystemRolesForUser(currentUser.id);
  if (systemRoles.length === 0) {
    ctx.throw(403);
  }
  return next();
}, 'systemRoleMemberGuard');
