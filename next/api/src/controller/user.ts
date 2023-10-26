import { Context } from 'koa';
import { z } from 'zod';
import _ from 'lodash';

import {
  Body,
  Controller,
  Ctx,
  CurrentUser,
  Get,
  HttpError,
  Pagination,
  Param,
  Post,
  Query,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { FindModelPipe, ParseCsvPipe, TrimPipe, ZodValidationPipe } from '@/common/pipe';
import { auth, customerServiceOnly, staffOnly, systemRoleMemberGuard } from '@/middleware';
import { DefaultGroupPermission } from '@/model/Group';
import { transformToHttpError, User } from '@/model/User';
import { UserResponse } from '@/response/user';
import { roleService } from '@/service/role';
import { getVerifiedPayloadWithSubRequired, processKeys, signPayload } from '@/utils/jwt';
import { withAsyncSpan } from '@/utils/trace';

const LegacyXDAuthSchema = z.object({
  type: z.literal('legacy-xd').default('legacy-xd'),
  XDAccessToken: z.string(),
});
const XDUserSchema = z.object({
  type: z.literal('xd-user'),
  id: z.string(),
  accessToken: z.string().optional(),
});
const JWTAuthSchema = z.object({
  type: z.literal('jwt').default('jwt'),
  jwt: z.string(),
});
const anonymouseAuthSchema = z.object({
  type: z.literal('anonymous').default('anonymous'),
  anonymousId: z.string().min(32),
  name: z.string().optional(),
});
const TDSUserSchema = z.object({
  type: z.literal('tds-user'),
  token: z.string(),
  associateAnonymousId: z.string().optional(),
});
const PasswordSchema = z.object({
  type: z.literal('password'),
  username: z.string(),
  password: z.string(),
});
const authSchema = z.union([
  JWTAuthSchema,
  anonymouseAuthSchema,
  LegacyXDAuthSchema,
  XDUserSchema,
  PasswordSchema,
  ...(process.env.ENABLE_TDS_USER_LOGIN ? [TDSUserSchema] : []),
]);
type AuthData = z.infer<typeof authSchema>;

const preCraeteSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().optional(),
  nickname: z.string().optional(),
});
type PreCreateUserData = z.infer<typeof preCraeteSchema>;

const exchangeSchema = z.object({
  jwt: z.string(),
});
type ExchangeData = z.infer<typeof exchangeSchema>;

const TDSUserPublicKey = processKeys(process.env.TDS_USER_PUBLIC_KEY);
const TDSUserSigningKey = process.env.TDS_USER_SIGNING_KEY;

const ENABLE_XD_USER_LOGIN = !!process.env.ENABLE_XD_USER_LOGIN;

@Controller('users')
export class UserController {
  @Get()
  @UseMiddlewares(auth, systemRoleMemberGuard)
  @ResponseBody(UserResponse)
  find(
    @Pagination() [page, pageSize]: [number, number],
    @Query('id', ParseCsvPipe) ids: string[] | undefined,
    @Query('q', TrimPipe) q: string | undefined
  ) {
    const query = User.queryBuilder().paginate(page, pageSize);

    if (ids && ids.length) {
      query.where('objectId', 'in', ids);
    }

    if (q) {
      query.where((query) => {
        query.orWhere('username', 'starts-with', q);
        query.orWhere('name', 'starts-with', q);
        query.orWhere('email', 'starts-with', q);
      });
    }

    return query.find({ useMasterKey: true });
  }

  @Get(':id/third-party-data')
  @UseMiddlewares(auth, staffOnly)
  getThirdPartyData(@Param('id', new FindModelPipe(User, { useMasterKey: true })) user: User) {
    return user.thirdPartyData;
  }

  @Get('me')
  @UseMiddlewares(auth)
  @ResponseBody(UserResponse)
  getMyself(@CurrentUser() currentUser: User) {
    return currentUser;
  }

  @Get('me/permissions')
  @UseMiddlewares(auth)
  async getMyPermissions(@CurrentUser() currentUser: User) {
    const groups = await currentUser.getGroups();
    return groups.reduce(
      (permissions, group) => _.mergeWith(permissions, group.permissions, (v1, v2) => v1 || v2),
      DefaultGroupPermission
    );
  }

  @Get('me/system-roles')
  @UseMiddlewares(auth)
  getMySystemRoles(@CurrentUser() currentUser: User) {
    return roleService.getSystemRolesForUser(currentUser.id);
  }

  @Get(':id')
  @UseMiddlewares(auth, staffOnly)
  @ResponseBody(UserResponse)
  findOne(@Param('id', new FindModelPipe(User, { useMasterKey: true })) user: User) {
    return user;
  }

  @Post()
  @UseMiddlewares((ctx, next) => transformToHttpError(next))
  async login(@Ctx() ctx: Context, @Body(new ZodValidationPipe(authSchema)) authData: AuthData) {
    if (authData.type === 'jwt') {
      return withAsyncSpan(
        () => User.loginWithJWT(authData.jwt),
        ctx,
        'model',
        'User.loginWithJWT'
      );
    } else if (authData.type === 'legacy-xd') {
      return withAsyncSpan(
        () => User.loginWithLegacyXDAccessToken(authData.XDAccessToken),
        ctx,
        'model',
        'User.loginWithLegacyXDAccessToken'
      );
    } else if (authData.type === 'xd-user') {
      if (!ENABLE_XD_USER_LOGIN) {
        throw new HttpError(403, 'This log method is not allowed');
      }
      return withAsyncSpan(
        () => User.loginWithXDUser(authData.id, authData.accessToken),
        ctx,
        'model',
        'User.loginWithXDUser'
      );
    } else if (authData.type === 'tds-user') {
      return withAsyncSpan(
        async () => {
          const { token, associateAnonymousId } = authData;

          if (!associateAnonymousId) {
            return User.loginWithTDSUserToken(token);
          }

          const tdsUser = await User.findByTDSUserToken(token);
          if (tdsUser) return { sessionToken: await tdsUser.loadSessionToken() };

          const user = await User.associateAnonymousWithTDSUser(token, associateAnonymousId);

          if (!user) {
            return User.loginWithTDSUserToken(token);
          }

          return { sessionToken: await user.loadSessionToken() };
        },
        ctx,
        'model',
        'User.loginWithTDSUserJWT'
      );
    } else if (authData.type === 'password') {
      return withAsyncSpan(
        () => User.loginWithPassword(authData.username, authData.password),
        ctx,
        'model',
        'User.loginWithPassword'
      );
    }
    return withAsyncSpan(
      () => User.loginWithAnonymousId(authData.anonymousId, authData.name),
      ctx,
      'model',
      'User.loginWithAnonymousId'
    );
  }

  @Post('pre-create')
  @UseMiddlewares(auth, customerServiceOnly)
  @ResponseBody(UserResponse)
  async preCreate(@Body(new ZodValidationPipe(preCraeteSchema)) data: PreCreateUserData) {
    const { email, username } = data;
    if (!email && !username) {
      throw new HttpError(400, 'You must provide an email or a username');
    }
    try {
      return await User.create(
        {
          // username might be `""`
          username: username ? username : email,
          name: data.nickname,
          email,
          password: Math.random().toString(),
        },
        { useMasterKey: true }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpError(400, message);
    }
  }

  @Post('tds/token')
  async exchangeJwt(
    @Ctx() ctx: Context,
    @Body(new ZodValidationPipe(exchangeSchema)) data: ExchangeData
  ) {
    const { jwt } = data;
    const { appId, sub } = transformToHttpError(() =>
      getVerifiedPayloadWithSubRequired(
        jwt,
        {
          algorithms: ['RS256'],
          issuer: 'tds-storage',
          audience: 'tap-support',
        },
        TDSUserPublicKey
      )
    );

    if (ctx.hostname !== 'support.xd.com' && appId === 'nxfahljt0g0tzsjwrw') {
      const url = new URL(ctx.url, 'https://support.xd.com');
      ctx.response.status = 307;
      ctx.response.set('Location', url.toString());
      ctx.response.body = '';
      ctx.res.end();
      return;
    }

    return {
      jwt: signPayload({ sub: `${appId}:${sub}` }, TDSUserSigningKey, {
        algorithm: 'HS256',
        expiresIn: '7d',
        issuer: 'tap-support',
      }),
    };
  }
}
