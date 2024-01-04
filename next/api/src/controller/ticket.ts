import _ from 'lodash';
import { Context } from 'koa';
import { z } from 'zod';
import {
  BadRequestError,
  Body,
  Controller,
  Ctx,
  CurrentUser,
  Delete,
  Get,
  Param,
  Post,
  Query,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { ParseBoolPipe, ZodValidationPipe } from '@/common/pipe';
import { customerServiceOnly, systemRoleMemberGuard } from '@/middleware';
import { UpdateData } from '@/orm';
import router from '@/router/ticket';
import { Ticket } from '@/model/Ticket';
import { TicketListItemResponse } from '@/response/ticket';
import { User } from '@/model/User';
import { redis } from '@/cache';
import { searchTicketService } from '@/service/search-ticket';
import { SearchTicketFilters, SearchTicketOptions } from '@/interfaces/ticket';
import { categoryService } from '@/category';

const createAssociatedTicketSchema = z.object({
  ticketId: z.string(),
});

const csvSchema = <T>(schema: z.Schema<T>) =>
  z.preprocess((value) => (typeof value === 'string' ? value.split(',') : value), z.array(schema));

const nullableStringSchema = z.string().transform((value) => (value === 'null' ? null : value));

const dateRangeSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value
      .split('..')
      .slice(0, 2)
      .map((v) => (v && v !== '*' ? new Date(v) : undefined));
  }
  return value;
}, z.tuple([z.date().optional(), z.date().optional()]));

const searchTicketSchema = z
  .object({
    authorId: z.string(),
    assigneeId: csvSchema(nullableStringSchema),
    categoryId: csvSchema(z.string()),
    rootCategoryId: z.string(),
    product: z.string(),
    groupId: csvSchema(nullableStringSchema),
    reporterId: csvSchema(nullableStringSchema),
    participantId: csvSchema(z.string()),
    status: csvSchema(z.enum(['50', '120', '160', '220', '250', '280'])),
    'evaluation.star': z.enum(['0', '1']),
    'evaluation.ts': dateRangeSchema,
    createdAt: dateRangeSchema,
    tagKey: z.string(),
    tagValue: z.string(),
    privateTagKey: z.string(),
    privateTagValue: z.string(),
    language: csvSchema(z.string()),
    fieldId: z.string(),
    fieldValue: z.string(),
    keyword: z.string(),
    where: z.string(), // Only for metaData
    orderBy: z.string(),
    page: z.preprocess(Number, z.number().int().min(1)),
    pageSize: z.preprocess(Number, z.number().int().min(0).max(100)),
  })
  .partial();

@Controller({ router, path: 'tickets' })
export class TicketController {
  @Get(':id/associated-tickets')
  @UseMiddlewares(systemRoleMemberGuard)
  @ResponseBody(TicketListItemResponse)
  getAssociatedTickets(@Ctx() ctx: Context) {
    const ticket = ctx.state.ticket as Ticket;
    return ticket.getAssociatedTickets();
  }

  @Post(':id/associated-tickets')
  @UseMiddlewares(customerServiceOnly)
  async createAssociatedTicket(
    @Ctx() ctx: Context,
    @Body(new ZodValidationPipe(createAssociatedTicketSchema))
    data: z.infer<typeof createAssociatedTicketSchema>
  ) {
    const ticket = ctx.state.ticket as Ticket;
    if (data.ticketId === ticket.id) {
      throw new BadRequestError('Cannot associate ticket itself');
    }

    const associatedTicket = await Ticket.find(data.ticketId, { useMasterKey: true });
    if (!associatedTicket) {
      throw new BadRequestError(`Ticket ${data.ticketId} does not exist`);
    }
    if (associatedTicket.authorId !== ticket.authorId) {
      throw new BadRequestError(`Cannot associate tickets which have different author`);
    }

    if (associatedTicket.parentId && ticket.parentId) {
      if (associatedTicket.parentId === ticket.parentId) {
        return;
      }
      throw new BadRequestError(
        `Ticket ${ticket.id} and ${associatedTicket.id} belong to different groups`
      );
    }

    const noParentIdTickets = [ticket, associatedTicket].filter((ticket) => !ticket.parentId);
    const parentId = ticket.parentId ?? associatedTicket.parentId ?? ticket.id;
    await Ticket.updateSome(
      noParentIdTickets.map((ticket) => [ticket, { parentId }]),
      { useMasterKey: true }
    );
  }

  @Delete(':id/associated-tickets/:associatedTicketId')
  @UseMiddlewares(customerServiceOnly)
  async deleteAssociatedTicket(
    @Ctx() ctx: Context,
    @Param('associatedTicketId') associatedTicketId: string
  ) {
    const ticket = ctx.state.ticket as Ticket;
    if (!ticket.parentId) {
      return;
    }

    const tickets = await Ticket.queryBuilder()
      .where('parent', '==', Ticket.ptr(ticket.parentId))
      .find({ useMasterKey: true });

    const [[disassociateTicket], restTickets] = _.partition(
      tickets,
      (ticket) => ticket.id === associatedTicketId
    );
    if (!disassociateTicket) {
      return;
    }

    const updatePairs: [Ticket, UpdateData<Ticket>][] = [[disassociateTicket, { parentId: null }]];

    if (restTickets.length === 1) {
      updatePairs.push([restTickets[0], { parentId: null }]);
    } else if (disassociateTicket.parentId === disassociateTicket.id) {
      restTickets.forEach((ticket, i, [mainTicket]) => {
        updatePairs.push([ticket, { parentId: mainTicket.id }]);
      });
    }

    await Ticket.updateSome(updatePairs, { useMasterKey: true });
  }

  // The :id is not used to avoid fetch ticket data by router.param
  // This API may be called frequently, and we do not care if the ticket exists
  @Get(':roomId/viewers')
  @UseMiddlewares(systemRoleMemberGuard)
  async getTicketViewers(
    @Param('roomId') id: string,
    @Query('excludeSelf', ParseBoolPipe) excludeSelf: boolean,
    @CurrentUser() user: User
  ) {
    const key = `ticket_viewers:${id}`;
    const now = Date.now();
    const results = await redis
      .pipeline()
      .zadd(key, now, user.id) // add current user to viewer set
      .expire(key, 100) // set ttl to 100 seconds
      .zremrangebyrank(key, 100, -1) // keep viewer set small
      .zremrangebyscore(key, '-inf', now - 1000 * 60) // remove viewers active 60 seconds ago
      .zrevrange(key, 0, -1) // get all viewers
      .exec();
    const viewers: string[] = _.last(results)?.[1] || [];
    return excludeSelf ? viewers.filter((id) => id !== user.id) : viewers;
  }

  @Get('search/v2')
  @UseMiddlewares(customerServiceOnly)
  @ResponseBody(TicketListItemResponse)
  async searchTickets(
    @Ctx() ctx: Context,
    @Query(new ZodValidationPipe(searchTicketSchema)) query: z.infer<typeof searchTicketSchema>
  ) {
    const searchOptions: SearchTicketOptions = {
      filters: {
        authorId: query.authorId,
        assigneeId: query.assigneeId,
        groupId: query.groupId,
        reporterId: query.reporterId,
        joinedCustomerServiceId: query.participantId,
        status: query.status?.map(Number),
        language: query.language,
        keyword: query.keyword,
      },
    };

    const rootCategoryId = query.product ?? query.rootCategoryId;
    if (rootCategoryId) {
      const categories = await categoryService.getSubCategories(rootCategoryId);
      let categoryIds = categories.map((c) => c.id);
      categoryIds.push(rootCategoryId);
      if (query.categoryId) {
        categoryIds.push(...query.categoryId);
      }
      categoryIds = _.uniq(categoryIds);
      if (categoryIds.length) {
        searchOptions.filters.categoryId = categoryIds;
      }
    }

    if (query['evaluation.star']) {
      searchOptions.filters.evaluationStar = Number(query['evaluation.star']);
    }
    if (query['evaluation.ts']) {
      const [from, to] = query['evaluation.ts'];
      searchOptions.filters.evaluationTs = {
        from: from?.toISOString(),
        to: to?.toISOString(),
      };
    }

    if (query.createdAt) {
      const [from, to] = query.createdAt;
      searchOptions.filters.createdAt = {
        from: from?.toISOString(),
        to: to?.toISOString(),
      };
    }

    if (query.tagKey && query.tagValue) {
      searchOptions.filters.tags = [
        {
          key: query.tagKey,
          value: query.tagValue,
        },
      ];
    }
    if (query.privateTagKey && query.privateTagValue) {
      searchOptions.filters.privateTags = [
        {
          key: query.privateTagKey,
          value: query.privateTagValue,
        },
      ];
    }

    if (query.fieldId && query.fieldValue) {
      searchOptions.filters.fields = [
        {
          id: query.fieldId,
          value: query.fieldValue,
        },
      ];
    }

    if (query.orderBy) {
      const [sortField, order] = query.orderBy.endsWith('-asc')
        ? ([query.orderBy.slice(0, -4), 'asc'] as const)
        : query.orderBy.endsWith('-desc')
        ? ([query.orderBy.slice(0, -5), 'desc'] as const)
        : ([query.orderBy, 'asc'] as const);
      searchOptions.sortField = sortField;
      searchOptions.order = order;
    }

    if (query.where) {
      // 兼容旧版 where.metaData 的用法
      try {
        const where = JSON.parse(query.where);
        if (_.isPlainObject(where)) {
          const metaData: SearchTicketFilters['metaData'] = [];
          Object.entries(where).forEach(([key, value]) => {
            if (key.startsWith('metaData.')) {
              switch (typeof value) {
                case 'string':
                  metaData.push({ key: key.slice(9), value });
                  break;
                case 'number':
                  metaData.push({ key: key.slice(9), value: value.toString() });
                  break;
              }
            }
          });
          if (metaData.length) {
            searchOptions.filters.metaData = metaData;
          }
        }
      } catch {} // ignore
    }

    const { page = 1, pageSize = 10 } = query;
    searchOptions.skip = (page - 1) * pageSize;
    searchOptions.limit = pageSize;

    const result = await searchTicketService.search(searchOptions);
    if (!result) {
      throw new BadRequestError('New search not enabled');
    }

    ctx.set('X-Total-Count', result.totalCount.toString());

    if (!result.ids.length) {
      return [];
    }

    const tickets = await Ticket.queryBuilder()
      .where('objectId', 'in', result.ids)
      .find({ useMasterKey: true });

    const ticketById = _.keyBy(tickets, (t) => t.id);
    return result.ids.map((id) => ticketById[id]).filter(Boolean);
  }
}
