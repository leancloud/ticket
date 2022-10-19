import { Context } from 'koa';
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
  ResponseBody,
  StatusCode,
  UseMiddlewares,
} from '@/common/http';
import { Order, ParseIntPipe, ParseOrderPipe, ZodValidationPipe } from '@/common/pipe';
import { auth, customerServiceOnly } from '@/middleware';
import { TicketFormResponse } from '@/response/ticket-form';
import service from './ticket-form.service';
import { createTicketFormSchema, updateTicketFormSchema } from './schemas';
import { CreateTicketFormData, UpdateTicketFormData } from './types';

@Controller('ticket-forms')
@UseMiddlewares(auth)
export class TicketFormController {
  @Get()
  @ResponseBody(TicketFormResponse)
  async list(
    @Ctx() ctx: Context,
    @Query('page', new ParseIntPipe({ min: 1 })) page = 1,
    @Query('pageSize', new ParseIntPipe({ min: 1, max: 1000 })) pageSize = 10,
    @Query('orderBy', new ParseOrderPipe(['id', 'updatedAt']))
    orderBy: Order[] = [{ key: 'id', order: 'asc' }]
  ) {
    orderBy.forEach((o) => {
      if (o.key === 'id') {
        o.key = 'objectId';
      }
    });
    const forms = await service.list({ page, pageSize, orderBy });
    const totalCount = await service.getTotalCount();
    ctx.set('x-total-count', totalCount.toString());
    return forms;
  }

  @Post()
  @UseMiddlewares(customerServiceOnly)
  @ResponseBody(TicketFormResponse)
  @StatusCode(201)
  create(@Body(new ZodValidationPipe(createTicketFormSchema)) data: CreateTicketFormData) {
    if (!data.fieldIds && !data.items) {
      throw new HttpError(400, 'body.items: Required');
    }
    return service.create(data);
  }

  @Get(':id')
  @ResponseBody(TicketFormResponse)
  get(@Param('id') id: string) {
    return service.mustGet(id);
  }

  @Patch(':id')
  @ResponseBody(TicketFormResponse)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTicketFormSchema)) data: UpdateTicketFormData
  ) {
    await service.update(id, data);
    return service.get(id);
  }

  @Delete(':id')
  @StatusCode(204)
  async delete(@Param('id') id: string) {
    await service.delete(id);
  }
}
