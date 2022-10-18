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
import { auth, customerServiceOnly } from '@/middleware';
import { User } from '@/model/User';
import { UserSearchResult } from '@/response/user';
import { withAsyncSpan } from '@/utils/trace';
import { Context } from 'koa';
import { z } from 'zod';

const LegacyXDAuthSchema = z.object({
  XDAccessToken: z.string(),
});
type LegacyXDAuthData = z.infer<typeof LegacyXDAuthSchema>;
const JWTAuthSchema = z.object({
  jwt: z.string(),
});
type JWTAuthData = z.infer<typeof JWTAuthSchema>;
const anonymouseAuthSchema = z.object({
  anonymousId: z.string().min(16),
  name: z.string().optional(),
});
const authSchema = JWTAuthSchema.or(anonymouseAuthSchema).or(LegacyXDAuthSchema);
type AuthData = z.infer<typeof authSchema>;

function isJWT(data: AuthData): data is JWTAuthData {
  return 'jwt' in data && typeof data.jwt === 'string';
}

function isLegacyXD(data: AuthData): data is LegacyXDAuthData {
  return 'XDAccessToken' in data && typeof data.XDAccessToken === 'string';
}

@Controller('users')
export class UserController {
  @Get()
  @UseMiddlewares(auth, customerServiceOnly)
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

  @Get(':id')
  @UseMiddlewares(auth, customerServiceOnly)
  @ResponseBody(UserSearchResult)
  findOne(@Param('id', new FindModelPipe(User)) user: User) {
    return user;
  }

  @Post()
  async login(@Ctx() ctx: Context, @Body(new ZodValidationPipe(authSchema)) authData: AuthData) {
    if (isJWT(authData)) {
      return withAsyncSpan(
        () => User.loginWithJWT(authData.jwt),
        ctx,
        'model',
        'User.loginWithJWT'
      );
    } else if (isLegacyXD(authData)) {
      return withAsyncSpan(
        () => User.loginWithLegacyXDAccessToken(authData.XDAccessToken),
        ctx,
        'model',
        'User.loginWithLegacyXDAccessToken'
      );
    }
    return User.loginWithAnonymousId(authData.anonymousId, authData.name);
  }
}
