import { z } from 'zod';
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
  Query,
  UseMiddlewares,
} from '@/common/http';
import { FindModelPipe, ParseCsvPipe, ZodValidationPipe } from '@/common/pipe';
import { auth } from '@/middleware';
import { User } from '@/model/User';
import { View } from '@/model/View';
import { Group } from '@/model/Group';
import { GroupResponse } from '@/response/group';
import { ViewResponse } from '@/response/view';

const conditionSchema = z.object({
  type: z.string(),
  op: z.string(),
  value: z.any(),
});

const conditionsSchema = z.object({
  all: z.array(conditionSchema),
  any: z.array(conditionSchema),
});

const sortOrderSchema = z.enum(['asc', 'desc']);

const createDataSchema = z.object({
  title: z.string(),
  userIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  conditions: conditionsSchema,
  fields: z.array(z.string()),
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema.optional(),
});

const updateDataSchema = z.object({
  title: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  conditions: conditionsSchema.optional(),
  fields: z.array(z.string()).optional(),
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema.optional(),
});

type CreateData = z.infer<typeof createDataSchema>;

type UpdateData = z.infer<typeof updateDataSchema>;

const idsSchema = z.array(z.string()).min(1);

@Controller('views')
@UseMiddlewares(auth)
export class ViewController {
  @Get()
  async findAll(
    @Query('userIds', ParseCsvPipe) userIds?: string[],
    @Query('groupIds', ParseCsvPipe) groupIds?: string[]
  ) {
    const query = View.queryBuilder();

    if (userIds) {
      query.where('userIds', 'in', userIds);
    } else {
      query.where('userIds', 'not-exists');
    }
    if (groupIds) {
      query.where('groupIds', 'in', groupIds);
    }

    const views = await query.limit(1000).find({ useMasterKey: true });

    return views.map((v) => new ViewResponse(v));
  }

  @Get('groups')
  async findViewGroups() {
    const query = View.queryBuilder().where('groupIds', 'exists');
    const views = await query.find({ useMasterKey: true });
    const groupIds = _(views).map('groupIds').compact().flatten().uniq().value();
    const groups = await Group.queryBuilder()
      .where('objectId', 'in', groupIds)
      .find({ useMasterKey: true });
    return groups.map((g) => new GroupResponse(g));
  }

  @Get(':id')
  async find(@Param('id', new FindModelPipe(View, { useMasterKey: true })) view: View) {
    return new ViewResponse(view);
  }

  @Post()
  async create(@Body(new ZodValidationPipe(createDataSchema)) data: CreateData) {
    if (data.userIds) {
      await this.assertUserExist(data.userIds);
    }
    if (data.groupIds) {
      await this.assertGroupExist(data.groupIds);
    }

    const view = await View.create(
      {
        title: data.title,
        userIds: data.userIds,
        groupIds: data.groupIds,
        conditions: data.conditions,
        fields: data.fields,
        sortBy: data.sortBy,
        sortOrder: data.sortOrder,
      },
      { useMasterKey: true }
    );

    return {
      id: view.id,
    };
  }

  @Patch(':id')
  async update(
    @Param('id', new FindModelPipe(View, { useMasterKey: true })) view: View,
    @Body(new ZodValidationPipe(updateDataSchema)) data: UpdateData
  ) {
    if (data.userIds) {
      await this.assertUserExist(data.userIds);
    }
    if (data.groupIds) {
      await this.assertGroupExist(data.groupIds);
    }

    await view.update(
      {
        title: data.title,
        userIds: data.userIds,
        groupIds: data.groupIds,
        conditions: data.conditions,
        fields: data.fields,
        sortBy: data.sortBy,
        sortOrder: data.sortOrder,
      },
      { useMasterKey: true }
    );

    return {};
  }

  @Delete(':id')
  async delete(@Param('id', new FindModelPipe(View, { useMasterKey: true })) view: View) {
    await view.delete({ useMasterKey: true });
    return {};
  }

  @Post('reorder')
  async reorder(@Body('ids', new ZodValidationPipe(idsSchema)) ids: string[]) {
    const views = await View.queryBuilder()
      .where('objectId', 'in', ids)
      .limit(1000)
      .find({ useMasterKey: true });

    const viewMap = _.keyBy(views, 'id');
    const updateDatas: [View, { position: number }][] = [];
    ids.forEach((id) => {
      const view = viewMap[id];
      if (view) {
        updateDatas.push([view, { position: updateDatas.length + 1 }]);
      }
    });

    if (updateDatas.length) {
      await View.updateSome(updateDatas, { useMasterKey: true });
    }

    return {};
  }

  async assertUserExist(userIds: string[]) {
    const users = await User.queryBuilder()
      .where('objectId', 'in', userIds)
      .find({ useMasterKey: true });
    if (users.length !== userIds.length) {
      const missingIds = _.difference(
        userIds,
        users.map((u) => u.id)
      );
      throw new HttpError(400, `body.userId: User "${missingIds[0]}" does not exist`);
    }
  }

  async assertGroupExist(groupIds: string[]) {
    const groups = await Group.queryBuilder()
      .where('objectId', 'in', groupIds)
      .find({ useMasterKey: true });
    if (groups.length !== groupIds.length) {
      const missingIds = _.difference(
        groupIds,
        groups.map((g) => g.id)
      );
      throw new HttpError(400, `body.groupId: Group "${missingIds[0]}" does not exist`);
    }
  }
}
