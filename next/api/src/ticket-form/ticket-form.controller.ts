import { Context } from 'koa';
import _ from 'lodash';
import {
  Body,
  Controller,
  Ctx,
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
import { Order, ParseIntPipe, ParseOrderPipe, ZodValidationPipe } from '@/common/pipe';
import { auth, adminOnly } from '@/middleware';
import { TicketFormResponse } from '@/response/ticket-form';
import { TicketFieldVariantResponse } from '@/response/ticket-field';
import service from './ticket-form.service';
import ticketFormNoteService from './ticket-form-note/ticket-form-note.service';
import { createTicketFormSchema, updateTicketFormSchema } from './schemas';
import { CreateTicketFormData, UpdateTicketFormData } from './types';
import { User } from '@/model/User';
import { ILocale, Locales } from '@/common/http/handler/param/locale';

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
  @UseMiddlewares(adminOnly)
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
  @UseMiddlewares(adminOnly)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTicketFormSchema)) data: UpdateTicketFormData
  ) {
    await service.update(id, data);
    return service.get(id);
  }

  @Delete(':id')
  @StatusCode(204)
  @UseMiddlewares(adminOnly)
  async delete(@Param('id') id: string) {
    await service.delete(id);
  }

  @Get(':id/items')
  async getItems(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
    @Locales() locales: ILocale
  ) {
    const form = await service.mustGet(id);
    const items = form.getItems();

    const noteIds = items.filter((item) => item.type === 'note').map((item) => item.id);
    const notes = await ticketFormNoteService.getSomeByPreferredLanguage(noteIds, locales.matcher);
    const noteById = _.keyBy(notes, (note) => note.noteId);

    const fieldVariants = await form.getFieldVariants(locales.matcher, currentUser);
    const fieldVariantByFieldId = _.keyBy(fieldVariants, (v) => v.fieldId);

    const result: any[] = [];
    for (const item of items) {
      if (item.type === 'field') {
        const fieldVariant = fieldVariantByFieldId[item.id];
        if (fieldVariant) {
          result.push({
            type: 'field',
            data: new TicketFieldVariantResponse(fieldVariant),
          });
        }
      } else if (item.type === 'note') {
        const note = noteById[item.id];
        if (note && note.active) {
          result.push({
            type: 'note',
            data: {
              id: note.id,
              content: note.content,
            },
          });
        }
      }
    }

    return result;
  }
}
