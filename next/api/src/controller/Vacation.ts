import { Context } from 'koa';
import { z } from 'zod';

import {
  Body,
  Controller,
  Ctx,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseMiddlewares,
} from '@/common/http';
import {
  FindModelPipe,
  Order,
  ParseCsvPipe,
  ParseIntPipe,
  ParseOrderPipe,
  ZodValidationPipe,
} from '@/common/pipe';
import { auth, customerServiceOnly } from '@/middleware';
import { User } from '@/model/User';
import { Vacation } from '@/model/Vacation';
import { VacationResponse } from '@/response/vacation';
import { ACLBuilder } from '@/orm';

const dateSchema = z.string().refine((str) => !Number.isNaN(Date.parse(str)), {
  message: 'Invalid date string',
});

const createVacationSchema = z.object({
  vacationerId: z.string(),
  startDate: dateSchema,
  endDate: dateSchema,
});

type CreateVacationData = z.infer<typeof createVacationSchema>;

@Controller('vacations')
@UseMiddlewares(auth, customerServiceOnly)
export class VacationController {
  @Get()
  async findAll(
    @Ctx() ctx: Context,
    @Query('vacationerId', ParseCsvPipe) vacationerId?: string[],
    @Query('operatorId', ParseCsvPipe) operatorId?: string[],
    @Query('orderBy', new ParseOrderPipe(['createdAt', 'startDate', 'endDate'])) orderBy?: Order[],
    @Query('page', new ParseIntPipe({ min: 1 })) page = 1,
    @Query('pageSize', new ParseIntPipe({ min: 0, max: 1000 })) pageSize = 10
  ) {
    const currentUser = ctx.state.currentUser as User;

    const query = Vacation.queryBuilder()
      .preload('operator')
      .preload('vacationer')
      .paginate(page, pageSize);

    orderBy?.forEach(({ key, order }) => query.orderBy(key, order));

    if (vacationerId?.length) {
      const pointers = vacationerId.map((id) => User.ptr(id));
      query.orWhere('vacationer', 'in', pointers);
    }
    if (operatorId?.length) {
      const pointers = operatorId.map((id) => User.ptr(id));
      query.orWhere('operator', 'in', pointers);
    }

    const [vacations, totalCount] = await query.findAndCount(currentUser.getAuthOptions());

    ctx.set('X-Total-Count', totalCount.toString());
    return vacations.map((v) => new VacationResponse(v));
  }

  @Post()
  async create(
    @Ctx() ctx: Context,
    @Body(new ZodValidationPipe(createVacationSchema)) data: CreateVacationData
  ) {
    const currentUser = ctx.state.currentUser as User;

    const ACL = new ACLBuilder()
      .allow(currentUser, 'write')
      .allow(data.vacationerId, 'write')
      .allowCustomerService('read');

    const vacation = await Vacation.create(
      {
        ACL,
        operatorId: currentUser.id,
        vacationerId: data.vacationerId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
      currentUser.getAuthOptions()
    );

    return {
      id: vacation.id,
    };
  }

  @Delete(':id')
  async delete(@Ctx() ctx: Context, @Param('id', new FindModelPipe(Vacation)) vacation: Vacation) {
    const currentUser = ctx.state.currentUser as User;
    await vacation.delete(currentUser.getAuthOptions());
    return {};
  }
}
