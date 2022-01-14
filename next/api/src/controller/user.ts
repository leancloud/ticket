import {
  Controller,
  CurrentUser,
  Get,
  Pagination,
  Query,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { auth, customerServiceOnly } from '@/middleware';
import { User } from '@/model/User';
import { UserResponse } from '@/response/user';

@Controller('users')
@UseMiddlewares(auth, customerServiceOnly)
export class UserController {
  @Get()
  @ResponseBody(UserResponse)
  findAll(
    @CurrentUser() currentUser: User,
    @Pagination() [page, pageSize]: [number, number],
    @Query('q') q?: string
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
