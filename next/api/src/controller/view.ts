import { Context } from 'koa';
import { z } from 'zod';
import _ from 'lodash';

import {
  Body,
  Controller,
  Ctx,
  Delete,
  Get,
  HttpError,
  Param,
  Patch,
  Post,
  Query,
  UseMiddlewares,
} from '@/common/http';
import {
  FindModelPipe,
  ParseBoolPipe,
  ParseCsvPipe,
  ParseIntPipe,
  ZodValidationPipe,
} from '@/common/pipe';
import { auth, customerServiceOnly, include } from '@/middleware';
import { ACLBuilder } from '@/orm';
import { User } from '@/model/User';
import { View } from '@/model/View';
import { Group } from '@/model/Group';
import { GroupResponse } from '@/response/group';
import { ViewResponse } from '@/response/view';
import { Ticket } from '@/model/Ticket';
import { TicketListItemResponse } from '@/response/ticket';
import { createViewCondition } from '@/ticket/view';
import { ViewConditionContext } from '@/ticket/view/conditions/ViewCondition';

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
@UseMiddlewares(auth, customerServiceOnly)
export class ViewController {
  @Get()
  async findAll(
    @Query('userIds', ParseCsvPipe) userIds?: string[],
    @Query('groupIds', ParseCsvPipe) groupIds?: string[]
  ) {
    const query = View.queryBuilder();

    const applyIdsCondition = (field: string, ids: string[]) => {
      const hasNull = ids.includes('null');
      if (hasNull) {
        ids = ids.filter((id) => id !== 'null');
      }
      query.where((query) => {
        if (ids.length) {
          query.where(field, 'in', ids);
        }
        if (hasNull) {
          query.orWhere(field, 'not-exists');
        }
      });
    };

    if (userIds) {
      applyIdsCondition('userIds', userIds);
    }
    if (groupIds) {
      applyIdsCondition('groupIds', groupIds);
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

  @Get('count')
  async getTicketCount(@Ctx() ctx: Context, @Query('ids', ParseCsvPipe) ids?: string[]) {
    if (!ids || ids.length === 0) {
      throw new HttpError(400, 'invalid ids');
    }

    const views = await View.queryBuilder()
      .where('objectId', 'in', ids)
      .find({ useMasterKey: true });

    const currentUser = ctx.state.currentUser as User;
    const authOptions = currentUser.getAuthOptions();
    const context = new ViewConditionContext(currentUser);

    const tasks = views.map(async (view) => {
      const ticketCount = await Ticket.queryBuilder()
        .setRawCondition(await view.getRawCondition(context))
        .count(authOptions);
      return { viewId: view.id, ticketCount };
    });

    return Promise.all(tasks);
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
    this.assertConditionIsValid(data.conditions);

    const ACL = new ACLBuilder().allowCustomerService('read', 'write');

    const view = await View.create(
      {
        ACL,
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
    if (data.conditions) {
      this.assertConditionIsValid(data.conditions);
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

  @Get(':id/tickets')
  @UseMiddlewares(include)
  async getTickets(
    @Ctx() ctx: Context,
    @Param('id', new FindModelPipe(View, { useMasterKey: true })) view: View,
    @Query('page', new ParseIntPipe({ min: 1 })) page = 1,
    @Query('pageSize', new ParseIntPipe({ min: 0, max: 1000 })) pageSize = 10,
    @Query('count', ParseBoolPipe) count?: boolean
  ) {
    const currentUser = ctx.state.currentUser as User;

    const context = new ViewConditionContext(currentUser);
    const query = Ticket.queryBuilder()
      .setRawCondition(await view.getRawCondition(context))
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    if (view.sortBy) {
      query.orderBy(view.sortBy, view.sortOrder === 'desc' ? 'desc' : 'asc');
    }

    if (ctx.query.includeAuthor) {
      query.preload('author');
    }
    if (ctx.query.includeAssignee) {
      query.preload('assignee');
    }
    if (ctx.query.includeGroup) {
      query.preload('group');
    }

    const authOptions = currentUser.getAuthOptions();
    const tickets = count
      ? await query.findAndCount(authOptions).then(([tickets, count]) => {
          ctx.set('X-Total-Count', count.toString());
          return tickets;
        })
      : await query.find(authOptions);

    return tickets.map((t) => new TicketListItemResponse(t));
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

  async assertConditionIsValid(conditions: z.infer<typeof conditionsSchema>) {
    const validate = (path: string, cond: any) => {
      const vc = createViewCondition(cond);
      const error = vc.validate();
      if (error) {
        const issue = error.issues[0];
        throw new HttpError(400, `${[path, ...issue.path].join('.')}: ${issue.message}`);
      }
    };

    conditions.all.forEach((cond) => validate('conditions.all', cond));
    conditions.any.forEach((cond) => validate('conditions.any', cond));
  }
}
