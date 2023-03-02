import { Context } from 'koa';
import { z } from 'zod';
import AV from 'leancloud-storage';

import {
  Body,
  Controller,
  CurrentUser,
  Delete,
  Get,
  HttpError,
  Param,
  Patch,
  Post,
  Query,
  ResponseBody,
  StatusCode,
  UseMiddlewares,
} from '@/common/http';
import { ZodValidationPipe } from '@/common/pipe';
import { auth, customerServiceOnly, systemRoleMemberGuard } from '@/middleware';
import { Category } from '@/model/Category';
import { Role } from '@/model/Role';
import { User } from '@/model/User';
import { CustomerServiceResponse } from '@/response/customer-service';
import { GroupResponse } from '@/response/group';

class FindCustomerServicePipe {
  static async transform(id: string, ctx: Context): Promise<User> {
    const user = await User.findOrFail(id);
    ctx.assert(await user.isCustomerService(), 404, `Customer service ${id} does not exist`);
    return user;
  }
}

const createCustomerServiceSchema = z.object({
  userId: z.string(),
});

const addCategorySchema = z.object({
  id: z.string(),
});

type CreateCustomerServiceData = z.infer<typeof createCustomerServiceSchema>;

type AddCategoryData = z.infer<typeof addCategorySchema>;

const updateCustomerServiceSchema = z.object({
  active: z.boolean().optional(),
});
type UpdateCustomerServiceData = z.infer<typeof updateCustomerServiceSchema>;

const findAllCustomerServicesSchema = z.object({
  active: z.preprocess(
    (val) => (val === 'true' ? true : val === 'false' ? false : val),
    z.boolean().optional()
  ),
});
type FindAllCustomerServicesData = z.infer<typeof findAllCustomerServicesSchema>;

@Controller('customer-services')
@UseMiddlewares(auth, systemRoleMemberGuard)
export class CustomerServiceController {
  @Get()
  @ResponseBody(CustomerServiceResponse)
  findAll(
    @Query(new ZodValidationPipe(findAllCustomerServicesSchema)) data: FindAllCustomerServicesData
  ) {
    return User.getCustomerServices(data.active);
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
  @UseMiddlewares(customerServiceOnly)
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

  @Patch(':id')
  @UseMiddlewares(customerServiceOnly)
  async update(
    @Body(new ZodValidationPipe(updateCustomerServiceSchema)) data: UpdateCustomerServiceData,
    @Param('id', FindCustomerServicePipe) user: User
  ) {
    if (data.active !== undefined) {
      if (data.active) {
        await user.update({ inactive: null }, { useMasterKey: true });
      } else {
        await user.update({ inactive: true }, { useMasterKey: true });
        await user.refreshSessionToken();
      }
    }
  }

  @Delete(':id')
  @UseMiddlewares(customerServiceOnly)
  async delete(@CurrentUser() currentUser: User, @Param('id', FindCustomerServicePipe) user: User) {
    const csRole = await Role.getCustomerServiceRole();
    const avRole = AV.Role.createWithoutData('_Role', csRole.id);
    const avUser = AV.User.createWithoutData('_User', user.id);
    avRole.relation('users').remove(avUser);
    await avRole.save(null, currentUser.getAuthOptions());

    return {};
  }

  @Post(':id/categories')
  @UseMiddlewares(customerServiceOnly)
  async addCategory(
    @CurrentUser() currentUser: User,
    @Param('id', FindCustomerServicePipe) customerService: User,
    @Body(new ZodValidationPipe(addCategorySchema)) data: AddCategoryData
  ) {
    const category = await Category.find(data.id);
    if (!category) {
      throw new HttpError(400, `Category ${data.id} does not exist`);
    }

    const categories = customerService.categories ?? [];
    if (!categories.some((c) => c.objectId === category.id)) {
      await customerService.update(
        {
          categories: [
            ...categories,
            {
              objectId: category.id,
              name: category.name,
            },
          ],
        },
        currentUser.getAuthOptions()
      );
    }

    return {};
  }

  @Delete(':id/categories/:categoryId')
  @UseMiddlewares(customerServiceOnly)
  async deleteCategory(
    @CurrentUser() currentUser: User,
    @Param('id', FindCustomerServicePipe) customerService: User,
    @Param('categoryId') categoryId: string
  ) {
    const { categories } = customerService;
    if (categories?.length) {
      const newCategories = categories.filter((c) => c.objectId !== categoryId);
      if (categories.length !== newCategories.length) {
        await customerService.update(
          {
            categories: newCategories,
          },
          currentUser.getAuthOptions()
        );
      }
    }

    return {};
  }
}
