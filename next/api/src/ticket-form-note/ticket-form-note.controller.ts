import { Context } from 'koa';
import {
  Body,
  Controller,
  Ctx,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StatusCode,
  UseMiddlewares,
} from '@/common/http';
import { ParseBoolPipe, ParseIntPipe, ZodValidationPipe } from '@/common/pipe';
import { auth, customerServiceOnly } from '@/middleware';
import service from './ticket-form-note.service';
import { createTicketFormNoteSchema, updateTicketFormNoteSchema } from './schemas';
import { CreateTicketFormNoteData, UpdateTicketFormNoteData } from './types';

@Controller('ticket-form-notes')
@UseMiddlewares(auth)
export class TicketFormNoteController {
  @Get()
  async list(
    @Ctx() ctx: Context,
    @Query('active', new ParseBoolPipe({ keepUndefined: true })) active: boolean | undefined,
    @Query('page', new ParseIntPipe({ min: 1 })) page = 1,
    @Query('pageSize', new ParseIntPipe({ min: 0, max: 1000 })) pageSize = 10
  ) {
    const notes = await service.list({ page, pageSize, active });
    const totalCount = await service.getTotalCount({ active });
    ctx.set('x-total-count', totalCount.toString());
    return notes;
  }

  @StatusCode(201)
  @Post()
  @UseMiddlewares(customerServiceOnly)
  create(@Body(new ZodValidationPipe(createTicketFormNoteSchema)) data: CreateTicketFormNoteData) {
    return service.create(data);
  }

  @Patch(':id')
  @UseMiddlewares(customerServiceOnly)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTicketFormNoteSchema)) data: UpdateTicketFormNoteData
  ) {
    await service.update(id, data);
    return service.get(id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return service.mustGet(id);
  }
}
