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
  ResponseBody,
  StatusCode,
  UseMiddlewares,
} from '@/common/http';
import { ParseBoolPipe, ParseIntPipe, ZodValidationPipe } from '@/common/pipe';
import { auth, adminOnly } from '@/middleware';
import service from './ticket-form-note.service';
import {
  createTicketFormNoteSchema,
  createTicketFormNoteTranslationSchema,
  updateTicketFormNoteSchema,
  updateTicketFormNoteTranslationSchema,
} from './schemas';
import {
  CreateTicketFormNoteData,
  CreateTicketFormNoteTranslationData,
  UpdateTicketFormNoteData,
  UpdateTicketFormNoteTranslationData,
} from './types';
import { ILocale, Locales } from '@/common/http/handler/param/locale';
import { TicketFormNoteTranslationResponse } from './responses';
import _ from 'lodash';

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

  @Get('detail')
  @UseMiddlewares(adminOnly)
  @ResponseBody(TicketFormNoteTranslationResponse)
  async listDetail(
    @Query('active', new ParseBoolPipe({ keepUndefined: true })) active: boolean | undefined,
    @Query('page', new ParseIntPipe({ min: 1 })) page = 1,
    @Query('pageSize', new ParseIntPipe({ min: 0, max: 1000 })) pageSize = 10,
    @Locales() locales: ILocale
  ) {
    const notes = await service.list({ page, pageSize, active });

    return service.getSomeByPreferredLanguage(notes, locales.matcher);
  }

  @StatusCode(201)
  @Post()
  @UseMiddlewares(adminOnly)
  create(@Body(new ZodValidationPipe(createTicketFormNoteSchema)) data: CreateTicketFormNoteData) {
    return service.create(data);
  }

  @Get(':id')
  @ResponseBody(TicketFormNoteTranslationResponse)
  get(@Param('id') id: string, @Locales() locales: ILocale) {
    return service.mustGetByPreferredLanguage(id, locales.matcher);
  }

  @Get(':id/detail')
  @UseMiddlewares(adminOnly)
  getDetail(@Param('id') id: string) {
    return service.mustGetWithLanguages(id);
  }

  @Patch(':id')
  @UseMiddlewares(adminOnly)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTicketFormNoteSchema)) data: UpdateTicketFormNoteData
  ) {
    await service.update(id, data);
    return service.mustGetWithLanguages(id);
  }

  @Post(':id')
  @UseMiddlewares(adminOnly)
  createTranslation(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createTicketFormNoteTranslationSchema))
    data: CreateTicketFormNoteTranslationData
  ) {
    return service.createTranslation(id, data);
  }

  @Get(':id/:language')
  @UseMiddlewares(adminOnly)
  getTranslation(@Param('id') id: string, @Param('language') language: string) {
    return service.mustGetTranslation(id, language);
  }

  @Patch(':id/:language')
  @UseMiddlewares(adminOnly)
  async updateTranslation(
    @Param('id') id: string,
    @Param('language') language: string,
    @Body(new ZodValidationPipe(updateTicketFormNoteTranslationSchema))
    data: UpdateTicketFormNoteTranslationData
  ) {
    await service.updateTranslation(id, language, data);
    return service.getTranslation(id, language);
  }
}
