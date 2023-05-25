import { UpdateData } from '@/orm';
import { DurationMetrics } from '@/model/DurationMetrics';
import { Reply } from '@/model/Reply';
import { Ticket } from '@/model/Ticket';
import { OperateAction } from '@/model/OpsLog';

export class DurationMetricService {
  createMetric(ticket: Ticket) {
    return DurationMetrics.create(
      {
        ticketId: ticket.id,
        ticketCreatedAt: ticket.createdAt,
      },
      {
        useMasterKey: true,
      }
    );
  }

  getMetricForTicket(ticket: Ticket) {
    return DurationMetrics.queryBuilder()
      .where('ticket', '==', ticket.toPointer())
      .first({ useMasterKey: true });
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
    if (!durationMetric) {
      return;
    }

    const data: UpdateData<DurationMetrics> = {};

    if (isAgent) {
      if (durationMetric.firstReplyTime === undefined) {
        data.firstReplyTime = reply.createdAt.getTime() - ticket.createdAt.getTime();
      }
      const requesterWaitAt = durationMetric.requesterWaitAt ?? ticket.createdAt;
      const duration = reply.createdAt.getTime() - requesterWaitAt.getTime();
      data.requesterWaitTime = (durationMetric.requesterWaitTime || 0) + duration;
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
    const durationMetric = await this.getMetricForTicket(ticket);
    if (!durationMetric) {
      return;
    }

    const now = Date.now();
    const data: UpdateData<DurationMetrics> = {};

    if (!durationMetric.firstResolutionTime) {
      data.firstResolutionTime = now - ticket.createdAt.getTime();
    }

    data.fullResolutionTime = now - ticket.createdAt.getTime();

    await durationMetric.update(data, { useMasterKey: true });
  }

  async recordReopenTicket(ticket: Ticket) {
    const durationMetric = await this.getMetricForTicket(ticket);
    if (!durationMetric) {
      return;
    }
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
