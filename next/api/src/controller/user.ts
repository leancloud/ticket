import {
  Controller,
  CurrentUser,
  Get,
  Pagination,
  Query,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { TrimPipe } from '@/common/pipe';
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
    @Query('q', TrimPipe) q?: string
  ) {
    const query = User.queryBuilder().paginate(page, pageSize);

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
