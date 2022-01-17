import { Context } from 'koa';
import { z } from 'zod';
import AV from 'leancloud-storage';

import {
  Body,
  Controller,
  CurrentUser,
  Delete,
  Get,
  Param,
  Post,
  ResponseBody,
  StatusCode,
  UseMiddlewares,
} from '@/common/http';
import { ZodValidationPipe } from '@/common/pipe';
import { auth, customerServiceOnly } from '@/middleware';
import { Role } from '@/model/Role';
import { User } from '@/model/User';
import { CustomerServiceResponse } from '@/response/customer-service';
import { GroupResponse } from '@/response/group';

class FindCustomerServicePipe {
  static async transform(id: string, ctx: Context): Promise<User> {
    if (id === 'me') {
      return ctx.state.currentUser;
    }
    const user = await User.findOrFail(id);
    ctx.assert(await user.isCustomerService(), 404, `Customer service ${id} does not exist`);
    return user;
  }
}

const createCustomerServiceSchema = z.object({
  userId: z.string(),
});

type CreateCustomerServiceData = z.infer<typeof createCustomerServiceSchema>;

@Controller('customer-services')
@UseMiddlewares(auth, customerServiceOnly)
export class CustomerServiceController {
  @Get()
  @ResponseBody(CustomerServiceResponse)
  findAll() {
    return User.getCustomerServices();
  }

  @Get(':id')
  @ResponseBody(CustomerServiceResponse)
  findOne(@Param('id', FindCustomerServicePipe) user: User) {
    return user;
  }

  @Get(':id/groups')
  @ResponseBody(GroupResponse)
  findGroups(@Param('id', FindCustomerServicePipe) user: User) {
    return user.getGroups();
  }

  @Post()
  @StatusCode(201)
  async create(
    @CurrentUser() currentUser: User,
    @Body(new ZodValidationPipe(createCustomerServiceSchema)) data: CreateCustomerServiceData
  ) {
    const csRole = await Role.getCustomerServiceRole();
    const avRole = AV.Role.createWithoutData('_Role', csRole.id);
    const avUser = AV.User.createWithoutData('_User', data.userId);
    avRole.relation('users').add(avUser);
    await avRole.save(null, currentUser.getAuthOptions());

    return {};
  }

  @Delete(':id')
  async delete(@CurrentUser() currentUser: User, @Param('id', FindCustomerServicePipe) user: User) {
    const csRole = await Role.getCustomerServiceRole();
    const avRole = AV.Role.createWithoutData('_Role', csRole.id);
    const avUser = AV.User.createWithoutData('_User', user.id);
    avRole.relation('users').remove(avUser);
    await avRole.save(null, currentUser.getAuthOptions());

    return {};
  }
}
