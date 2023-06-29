import _ from 'lodash';
import { Context } from 'koa';
import { z } from 'zod';
import {
  BadRequestError,
  Body,
  Controller,
  Ctx,
  Delete,
  Get,
  Param,
  Post,
  UseMiddlewares,
} from '@/common/http';
import { ZodValidationPipe } from '@/common/pipe';
import { customerServiceOnly } from '@/middleware';
import { UpdateData } from '@/orm';
import router from '@/router/ticket';
import { Ticket } from '@/model/Ticket';

const createAssociatedTicketSchema = z.object({
  ticketId: z.string(),
});

@Controller({ router, path: 'tickets' })
export class TicketController {
  @Get(':id/associated-tickets')
  @UseMiddlewares(customerServiceOnly)
  getAssociatedTickets(@Ctx() ctx: Context) {
    const ticket = ctx.state.ticket as Ticket;
    return ticket.getAssociatedTickets({ useMasterKey: true });
  }

  @Post(':id/associated-tickets')
  @UseMiddlewares(customerServiceOnly)
  async createAssociatedTicket(
    @Ctx() ctx: Context,
    @Body(new ZodValidationPipe(createAssociatedTicketSchema))
    data: z.infer<typeof createAssociatedTicketSchema>
  ) {
    const ticket = ctx.state.ticket as Ticket;

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
}
