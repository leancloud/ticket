import { UpdateData } from '@/orm';
import { DurationMetric } from '@/model/DurationMetric';
import { Reply } from '@/model/Reply';
import { Ticket } from '@/model/Ticket';
import { OperateAction } from '@/model/OpsLog';

export class DurationMetricService {
  createMetric(ticket: Ticket) {
    return DurationMetric.create(
      {
        ticketId: ticket.id,
        ticketCreatedAt: ticket.createdAt,
      },
      {
        useMasterKey: true,
      }
    );
  }

  async getMetricForTicket(ticket: Ticket) {
    const durationMetric = await DurationMetric.queryBuilder()
      .where('ticket', '==', ticket.toPointer())
      .first({ useMasterKey: true });
    if (!durationMetric) {
      throw new Error(`Duration metric of ticket ${ticket.id} does not exist`);
    }
    return durationMetric;
  }

  async recordReplyTicket(ticket: Ticket, reply: Reply, isAgent: boolean) {
    if (isAgent) {
      if (ticket.status === Ticket.Status.WAITING_CUSTOMER) {
        return;
      }
    } else {
      if (
        ticket.status === Ticket.Status.NEW ||
        ticket.status === Ticket.Status.WAITING_CUSTOMER_SERVICE
      ) {
        return;
      }
    }

    const durationMetric = await this.getMetricForTicket(ticket);
    const data: UpdateData<DurationMetric> = {};

    if (isAgent) {
      if (durationMetric.requesterWaitAt) {
        const duration = reply.createdAt.getTime() - durationMetric.requesterWaitAt.getTime();
        data.requesterWaitTime = (durationMetric.requesterWaitTime || 0) + duration;
      } else {
        const duration = reply.createdAt.getTime() - ticket.createdAt.getTime();
        data.requesterWaitTime = (durationMetric.requesterWaitTime || 0) + duration;
        data.firstReplyTime = duration;
      }
      data.agentWaitAt = reply.createdAt;
    } else {
      if (durationMetric.agentWaitAt) {
        const duration = reply.createdAt.getTime() - durationMetric.agentWaitAt.getTime();
        data.agentWaitTime = (durationMetric.agentWaitTime || 0) + duration;
      }
      data.requesterWaitAt = reply.createdAt;
    }

    await durationMetric.update(data, { useMasterKey: true });
  }

  async recordOperateTicket(ticket: Ticket, action: OperateAction) {
    if (action === 'close' || action === 'resolve') {
      await this.recordResolveTicket(ticket);
    } else if (action === 'reopen') {
      await this.recordReopenTicket(ticket);
    }
  }

  async recordResolveTicket(ticket: Ticket) {
    const now = Date.now();
    const durationMetric = await this.getMetricForTicket(ticket);
    const data: UpdateData<DurationMetric> = {};

    if (!durationMetric.firstResolutionTime) {
      data.firstResolutionTime = now - ticket.createdAt.getTime();
    }

    data.fullResolutionTime = now - ticket.createdAt.getTime();

    await durationMetric.update(data, { useMasterKey: true });
  }

  async recordReopenTicket(ticket: Ticket) {
    const durationMetric = await this.getMetricForTicket(ticket);
    await durationMetric.update(
      {
        agentWaitAt: new Date(),
      },
      {
        useMasterKey: true,
      }
    );
  }
}

export const durationMetricService = new DurationMetricService();
