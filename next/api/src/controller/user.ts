import {
  Body,
  Controller,
  Ctx,
  CurrentUser,
  Get,
  Pagination,
  Param,
  Post,
  Query,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { FindModelPipe, ParseCsvPipe, TrimPipe, ZodValidationPipe } from '@/common/pipe';
import { auth, staffOnly } from '@/middleware';
import { User } from '@/model/User';
import { UserSearchResult } from '@/response/user';
import { withAsyncSpan } from '@/utils/trace';
import { Context } from 'koa';
import { z } from 'zod';

const LegacyXDAuthSchema = z.object({
  type: z.literal('legacy-xd').default('legacy-xd'),
  XDAccessToken: z.string(),
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
const authSchema = z.union([
  JWTAuthSchema,
  anonymouseAuthSchema,
  LegacyXDAuthSchema,
  TDSUserSchema,
]);
type AuthData = z.infer<typeof authSchema>;

@Controller('users')
export class UserController {
  @Get()
  @UseMiddlewares(auth, staffOnly)
  @ResponseBody(UserSearchResult)
  find(
    @CurrentUser() currentUser: User,
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

    return query.find(currentUser.getAuthOptions());
  }

  @Get(':id/third-party-data')
  @UseMiddlewares(auth, staffOnly)
  getThirdPartyData(@Param('id', new FindModelPipe(User, { useMasterKey: true })) user: User) {
    return user.thirdPartyData;
  }

  @Get(':id')
  @UseMiddlewares(auth, staffOnly)
  @ResponseBody(UserSearchResult)
  findOne(@Param('id', new FindModelPipe(User)) user: User) {
    return user;
  }

  @Post()
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
    }
    return User.loginWithAnonymousId(authData.anonymousId, authData.name);
  }
}
