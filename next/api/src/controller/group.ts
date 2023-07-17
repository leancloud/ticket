import { z } from 'zod';
import AV from 'leancloud-storage';
import _ from 'lodash';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpError,
  Param,
  Patch,
  Post,
  ResponseBody,
  StatusCode,
  UseMiddlewares,
} from '@/common/http';
import { auth, adminOnly, systemRoleMemberGuard } from '@/middleware';
import { ACLBuilder } from '@/orm';
import { DefaultGroupPermission, Group } from '@/model/Group';
import { User } from '@/model/User';
import { GroupDetailResponse, GroupResponse } from '@/response/group';
import { FindModelPipe, ZodValidationPipe } from '@/common/pipe';

const groupPermissionSchema = z
  .object({
    view: z.boolean(),
    ticketList: z.boolean(),
    statistics: z.boolean(),
  })
  .partial();

const createGroupSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  permissions: groupPermissionSchema.optional(),
});

const updateGroupSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  permissions: groupPermissionSchema.optional(),
});

type CreateGroupData = z.infer<typeof createGroupSchema>;

type UpdateGroupData = z.infer<typeof updateGroupSchema>;

@Controller('groups')
@UseMiddlewares(auth, systemRoleMemberGuard)
export class GroupController {
  @Get()
  @ResponseBody(GroupResponse)
  findAll() {
    return Group.queryBuilder().find({ useMasterKey: true });
  }

  @Post()
  @UseMiddlewares(adminOnly)
  @StatusCode(201)
  async create(@Body(new ZodValidationPipe(createGroupSchema)) data: CreateGroupData) {
    if (data.userIds?.length) {
      data.userIds = await this.stripNonCustomerServiceUser(data.userIds);
    }

    const groupACL = new ACLBuilder().allowCustomerService('read', 'write').allowStaff('read');
    const group = await Group.create(
      {
        ACL: groupACL,
        name: data.name,
        description: data.description,
        permissions: { ...DefaultGroupPermission, ...data.permissions },
      },
      {
        useMasterKey: true,
      }
    );

    const role = await this.createGroupRole(group.id, data.userIds);
    await group.update({ roleId: role.id }, { useMasterKey: true });

    return {
      id: group.id,
    };
  }

  @Get(':id')
  async findOne(@Param('id', new FindModelPipe(Group)) group: Group) {
    const role = await this.findGroupRole(group, { useMasterKey: true });
    const users = await role.getUsers().query().find({ useMasterKey: true });
    const userIds = users.map((u) => u.id!);
    return new GroupDetailResponse(group, userIds);
  }

  @Patch(':id')
  @UseMiddlewares(adminOnly)
  async update(
    @Param('id', new FindModelPipe(Group)) group: Group,
    @Body(new ZodValidationPipe(updateGroupSchema)) data: UpdateGroupData
  ) {
    if (data.userIds?.length) {
      data.userIds = await this.stripNonCustomerServiceUser(data.userIds);
    }

    const authOptions = { useMasterKey: true };

    if (data.name || data.description || data.permissions) {
      await group.update(
        {
          name: data.name,
          description: data.description,
          permissions: { ...DefaultGroupPermission, ...data.permissions },
        },
        authOptions
      );
    }

    if (data.userIds) {
      const role = await this.findGroupRole(group, authOptions);

      const users = await role.getUsers().query().find(authOptions);
      const userIds = users.map((u) => u.id!);
      const userRelation = role.getUsers();

      const userIdsToAdd = _.difference(userIds, data.userIds);
      if (userIdsToAdd.length) {
        userIdsToAdd.forEach((userId) => {
          const user = AV.User.createWithoutData('_User', userId) as AV.User;
          userRelation.remove(user);
        });
        await role.save(null, authOptions);
      }

      const userIdsToRemove = _.difference(data.userIds, userIds);
      if (userIdsToRemove.length) {
        userIdsToRemove.forEach((userId) => {
          const user = AV.User.createWithoutData('_User', userId) as AV.User;
          userRelation.add(user);
        });
        await role.save(null, authOptions);
      }
    }

    return {};
  }

  @Delete(':id')
  @UseMiddlewares(adminOnly)
  async delete(@Param('id', new FindModelPipe(Group)) group: Group) {
    await group.delete({ useMasterKey: true });

    const role = AV.Role.createWithoutData('_Role', group.roleId);
    await role.destroy({ useMasterKey: true });

    return {};
  }

  private async createGroupRole(groupId: string, userIds?: string[]): Promise<AV.Role> {
    const roleACL = new ACLBuilder()
      .allowCustomerService('read', 'write')
      .allowStaff('read')
      .toJSON();
    const role = new AV.Role(`group_${groupId}`, new AV.ACL(roleACL));
    if (userIds?.length) {
      const userRelation = role.getUsers();
      userIds.forEach((userId) => {
        const avUser = AV.User.createWithoutData('_User', userId) as AV.User;
        userRelation.add(avUser);
      });
    }
    return role.save();
  }

  private async findGroupRole(group: Group, authOptions: AV.AuthOptions): Promise<AV.Role> {
    const query = new AV.Query(AV.Role).equalTo('objectId', group.roleId);
    const role = await query.first(authOptions);
    if (!role) {
      throw new HttpError(500, `Role of group ${group.id} is missing`);
    }
    return role;
  }

  private async stripNonCustomerServiceUser(userIds: string[]) {
    const customerServices = await User.getCustomerServices();
    const csIds = new Set(customerServices.map((c) => c.id));
    return userIds.filter((userId) => csIds.has(userId));
  }
}
