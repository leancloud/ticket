import { Context } from 'koa';
import { z } from 'zod';
import AV from 'leancloud-storage';

import {
  BadRequestError,
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
import { ParseBoolPipe, ZodValidationPipe } from '@/common/pipe';
import { adminOnly, auth, systemRoleMemberGuard } from '@/middleware';
import { Category } from '@/model/Category';
import { Role } from '@/model/Role';
import { User } from '@/model/User';
import { CustomerServiceResponse } from '@/response/customer-service';
import { GroupResponse } from '@/response/group';
import { roleService } from '@/service/role';

class FindCustomerServicePipe {
  static async transform(id: string, ctx: Context): Promise<User> {
    const user = await User.findOrFail(id);
    ctx.assert(await user.isCustomerService(), 404, `Customer service ${id} does not exist`);
    return user;
  }
}

const roleSchema = z.union([z.literal('admin'), z.literal('customerService')]);
const rolesSchema = z.array(roleSchema).nonempty();

const createCustomerServiceSchema = z.object({
  userId: z.string(),
  roles: rolesSchema,
});

const addCategorySchema = z.object({
  id: z.string(),
});

type CreateCustomerServiceData = z.infer<typeof createCustomerServiceSchema>;

type AddCategoryData = z.infer<typeof addCategorySchema>;

const updateCustomerServiceSchema = z.object({
  active: z.boolean().optional(),
  roles: rolesSchema.optional(),
});
type UpdateCustomerServiceData = z.infer<typeof updateCustomerServiceSchema>;

@Controller('customer-services')
@UseMiddlewares(auth, systemRoleMemberGuard)
export class CustomerServiceController {
  @Get()
  @ResponseBody(CustomerServiceResponse)
  findAll(
    @Query('active', new ParseBoolPipe({ keepUndefined: true })) active: boolean | undefined,
    @Query('admin', ParseBoolPipe) admin: boolean
  ) {
    return admin ? User.getAdmins(active) : User.getCustomerServices(active);
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
  @UseMiddlewares(adminOnly)
  @StatusCode(201)
  async create(
    @Body(new ZodValidationPipe(createCustomerServiceSchema)) data: CreateCustomerServiceData
  ) {
    if (
      (await User.isCustomerService({ id: data.userId })) ||
      (await User.isAdmin({ id: data.userId }))
    ) {
      throw new BadRequestError('This user is already customer service or admin');
    }

    await Promise.all([
      data.roles.map(async (v) => {
        if (v === 'admin') {
          const adminRole = await Role.getAdminRole();
          return roleService.addUserToRole(adminRole.id, data.userId);
        } else if (v === 'customerService') {
          const csRole = await Role.getCustomerServiceRole();
          return roleService.addUserToRole(csRole.id, data.userId);
        }
      }),
    ]);

    return {};
  }

  @Patch(':id')
  @UseMiddlewares(adminOnly)
  async update(
    @Body(new ZodValidationPipe(updateCustomerServiceSchema)) data: UpdateCustomerServiceData,
    @Param('id', FindCustomerServicePipe) user: User
  ) {
    const processQueue: Promise<any>[] = [];

    if (data.active !== undefined) {
      if (data.active) {
        processQueue.push(user.update({ inactive: null }, { useMasterKey: true }));
      } else {
        processQueue.push(
          user
            .update({ inactive: true }, { useMasterKey: true })
            .then(() => user.refreshSessionToken())
        );
      }
    }

    if (data.roles !== undefined) {
      processQueue.push(roleService.updateUserCSRoleTo(data.roles, user.id));
    }

    await Promise.all(processQueue);

    return {};
  }

  @Delete(':id')
  @UseMiddlewares(adminOnly)
  async delete(@Param('id', FindCustomerServicePipe) user: User) {
    await Promise.all([
      Role.getAdminRole()
        .then(({ id }) => AV.Role.createWithoutData('_Role', id))
        .then(({ id }) => {
          if (id) return roleService.removeUserFromRole(id, user.id);
        }),
      Role.getCustomerServiceRole()
        .then(({ id }) => AV.Role.createWithoutData('_Role', id))
        .then(({ id }) => {
          if (id) return roleService.removeUserFromRole(id, user.id);
        }),
    ]);

    return {};
  }

  @Post(':id/categories')
  @UseMiddlewares(adminOnly)
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
  @UseMiddlewares(adminOnly)
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
