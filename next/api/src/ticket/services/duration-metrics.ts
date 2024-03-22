import { addMilliseconds, differenceInMilliseconds, isAfter } from 'date-fns';
import _ from 'lodash';

import { Queue, createQueue } from '@/queue';
import { DurationMetrics } from '@/model/DurationMetrics';
import { Ticket } from '@/model/Ticket';
import { Action } from '@/model/OpsLog';
import { ticketService } from '@/service/ticket';

interface CreateDurationMetricsJobData {
  ticketId: string;
  timelineCursor?: string;
  metrics?: RawDurationMetricsData;
  isTicketOpen?: boolean;
}

interface DispatchDurationMetricsJobJobData {
  from: string;
  to: string;
}

type DurationMetricsJobData =
  | (CreateDurationMetricsJobData & { type: 'create' })
  | (DispatchDurationMetricsJobJobData & { type: 'dispatch' });

interface Timeline {
  type: Action | 'reply';
  createdAt: Date;
  isAgent?: boolean;
}

type DurationMetricsData = Pick<
  DurationMetrics,
  | 'ticketCreatedAt'
  | 'firstReplyTime'
  | 'firstResolutionTime'
  | 'fullResolutionTime'
  | 'requesterWaitAt'
  | 'requesterWaitTime'
  | 'agentWaitAt'
  | 'agentWaitTime'
>;

type RawDurationMetricsData = {
  [K in keyof DurationMetricsData]: number extends DurationMetricsData[K]
    ? DurationMetricsData[K]
    : string;
};

export class DurationMetricsService {
  private queue: Queue<DurationMetricsJobData>;

  constructor() {
    this.queue = createQueue('ticket_duration_metrics', {
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
    this.queue.process((job) => {
      switch (job.data.type) {
        case 'create':
          return this.processCreateMetricsJob(job.data);
        case 'dispatch':
          return this.processDispatchMetricsJobJob(job.data);
      }
    });
  }

  async saveMetrics(ticketId: string, metricsData: DurationMetricsData) {
    const metrics = await DurationMetrics.queryBuilder()
      .where('ticket', '==', Ticket.ptr(ticketId))
      .first({ useMasterKey: true });
    if (metrics) {
      await metrics.update(metricsData, { useMasterKey: true });
      return;
    }
    await DurationMetrics.create(
      {
        ACL: {},
        ticketId,
        ...metricsData,
      },
      {
        useMasterKey: true,
      }
    );
  }

  decodeDurationMetricsData(rawData: RawDurationMetricsData) {
    const data: DurationMetricsData = {
      ticketCreatedAt: new Date(rawData.ticketCreatedAt),
      firstReplyTime: rawData.firstReplyTime,
      firstResolutionTime: rawData.firstResolutionTime,
      fullResolutionTime: rawData.fullResolutionTime,
      requesterWaitTime: rawData.requesterWaitTime,
      agentWaitTime: rawData.agentWaitTime,
    };
    if (rawData.requesterWaitAt) {
      data.requesterWaitAt = new Date(rawData.requesterWaitAt);
    }
    if (rawData.agentWaitAt) {
      data.agentWaitAt = new Date(rawData.agentWaitAt);
    }
    return data;
  }

  encodeDurationMetricsData(data: DurationMetricsData): RawDurationMetricsData {
    return {
      ticketCreatedAt: data.ticketCreatedAt.toISOString(),
      firstReplyTime: data.firstReplyTime,
      firstResolutionTime: data.firstResolutionTime,
      fullResolutionTime: data.fullResolutionTime,
      requesterWaitTime: data.requesterWaitTime,
      agentWaitTime: data.agentWaitTime,
      requesterWaitAt: data.requesterWaitAt?.toISOString(),
      agentWaitAt: data.agentWaitAt?.toISOString(),
    };
  }

  async createCreateMetricsJob(
    data: CreateDurationMetricsJobData | CreateDurationMetricsJobData[]
  ) {
    if (Array.isArray(data)) {
      await this.queue.addBulk(data.map((data) => ({ data: { type: 'create', ...data } })));
    } else {
      await this.queue.add({ type: 'create', ...data });
    }
  }

  async processCreateMetricsJob(data: CreateDurationMetricsJobData) {
    let metrics: DurationMetricsData;
    if (data.metrics) {
      metrics = this.decodeDurationMetricsData(data.metrics);
    } else {
      const ticket = await Ticket.queryBuilder()
        .where('objectId', '==', data.ticketId)
        .first({ useMasterKey: true });
      if (!ticket || !ticket.isClosed()) {
        return;
      }
      metrics = {
        ticketCreatedAt: ticket.createdAt,
        requesterWaitAt: ticket.createdAt,
      };
    }

    const timelineCursor = data.timelineCursor ? new Date(data.timelineCursor) : undefined;

    const limit = 500;
    let replies = await ticketService.getReplies(data.ticketId, {
      internal: false,
      deleted: false,
      cursor: timelineCursor,
      limit,
    });
    let opsLogs = await ticketService.getOpsLogs(data.ticketId, {
      actions: ['replyWithNoContent', 'close', 'resolve', 'reopen'],
      cursor: timelineCursor,
      limit,
    });

    let nextCursor: Date | undefined;
    if (replies.length === limit || opsLogs.length === limit) {
      nextCursor = _([_.last(replies)?.createdAt, _.last(opsLogs)?.createdAt])
        .compact()
        .minBy((v) => v.getTime());
    }

    if (nextCursor) {
      const boundary = nextCursor;
      replies = _.reject(replies, (reply) => isAfter(reply.createdAt, boundary));
      opsLogs = _.reject(opsLogs, (opsLog) => isAfter(opsLog.createdAt, boundary));
    }

    const timeline = [
      ...replies.map<Timeline>((reply) => ({
        type: 'reply',
        createdAt: reply.createdAt,
        isAgent: reply.isCustomerService,
      })),
      ...opsLogs.map<Timeline>((opsLog) => ({
        type: opsLog.action,
        createdAt: opsLog.createdAt,
      })),
    ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    let isTicketOpen = data.isTicketOpen ?? true;
    for (const t of timeline) {
      switch (t.type) {
        case 'reply':
          if (isTicketOpen) {
            if (t.isAgent) {
              metrics.firstReplyTime ??= differenceInMilliseconds(
                t.createdAt,
                metrics.ticketCreatedAt
              );
              if (metrics.requesterWaitAt) {
                metrics.requesterWaitTime ??= 0;
                metrics.requesterWaitTime += differenceInMilliseconds(
                  t.createdAt,
                  metrics.requesterWaitAt
                );
                metrics.requesterWaitAt = undefined;
              }
              metrics.agentWaitAt ??= t.createdAt;
            } else {
              if (metrics.agentWaitAt) {
                metrics.agentWaitTime ??= 0;
                metrics.agentWaitTime += differenceInMilliseconds(t.createdAt, metrics.agentWaitAt);
                metrics.agentWaitAt = undefined;
              }
              metrics.requesterWaitAt ??= t.createdAt;
            }
          }
          break;
        case 'replyWithNoContent':
          if (isTicketOpen) {
            metrics.requesterWaitAt = undefined;
          }
          break;
        case 'close':
        case 'resolve':
          isTicketOpen = false;
          const resolutionTime = differenceInMilliseconds(t.createdAt, metrics.ticketCreatedAt);
          metrics.firstResolutionTime ??= resolutionTime;
          metrics.fullResolutionTime = resolutionTime;
          break;
        case 'reopen':
          isTicketOpen = true;
          metrics.agentWaitAt = undefined;
          metrics.requesterWaitAt = undefined;
          break;
      }
    }

    if (nextCursor) {
      await this.createCreateMetricsJob({
        ticketId: data.ticketId,
        timelineCursor: nextCursor.toISOString(),
        metrics: this.encodeDurationMetricsData(metrics),
        isTicketOpen,
      });
    } else {
      await this.saveMetrics(data.ticketId, metrics);
    }
  }

  async processDispatchMetricsJobJob(data: DispatchDurationMetricsJobJobData) {
    const limit = 100;
    const tickets = await Ticket.queryBuilder()
      .where('createdAt', '>=', new Date(data.from))
      .where('createdAt', '<=', new Date(data.to))
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .find({ useMasterKey: true });

    if (tickets.length === 0) {
      console.log('[Duration Metrics] dispatch jobs done');
      return;
    }

    await this.createCreateMetricsJob(tickets.map((ticket) => ({ ticketId: ticket.id })));

    console.log(
      `[Duration Metrics] [${tickets[0].createdAt}..${_.last(tickets)!.createdAt}] ${
        tickets.length
      } job(s) dispatched`
    );

    await this.queue.add(
      {
        type: 'dispatch',
        from: addMilliseconds(_.last(tickets)!.createdAt, 1).toISOString(),
        to: data.to,
      },
      {
        delay: 10000,
      }
    );
  }
}

export const durationMetricsService = new DurationMetricsService();
