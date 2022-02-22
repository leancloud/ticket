import {
  Controller,
  CurrentUser,
  Get,
  Pagination,
  Query,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { ParseCsvPipe, TrimPipe } from '@/common/pipe';
import { auth, customerServiceOnly } from '@/middleware';
import { User } from '@/model/User';
import { UserSearchResult } from '@/response/user';

@Controller('users')
@UseMiddlewares(auth, customerServiceOnly)
export class UserController {
  @Get()
  @ResponseBody(UserSearchResult)
  findAll(
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
}
