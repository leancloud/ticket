import { differenceInMilliseconds } from 'date-fns';
import { simpleToTradition } from 'chinese-simple2traditional';

import { Config } from '@/config';
import { ACLBuilder } from '@/orm';
import { User } from '@/model/User';
import { Ticket } from '@/model/Ticket';
import { Reply } from '@/model/Reply';
import { Action, OpsLog } from '@/model/OpsLog';
import { userService } from '@/user/services/user';
import { createQueue, Job, Queue } from '@/queue';
import { DetectTicketLanguageJobData } from '@/interfaces/ticket';
import { allowedTicketLanguages } from '@/utils/locale';
import { translateService } from './translate';
import { searchTicketService } from '@/service/search-ticket'

interface GetRepliesOptions {
  author?: boolean;
  files?: boolean;

  /**
   * Should include internal replies
   */
  internal?: boolean;

  /**
   * Should include deleted replies
   */
  deleted?: boolean;

  skip?: number;
  limit?: number;
  cursor?: Date;
  desc?: boolean;
  count?: boolean;
}

interface GetOpsLogsOptions {
  actions?: Action[];
  skip?: number;
  limit?: number;
  cursor?: Date;
  desc?: boolean;
}

interface TransferTicketJobData {
  sourceUserId: string;
  targetUserId: string;
  mergeUserTaskId?: string;
}

export class TicketService {
  private detectLangQueue?: Queue<DetectTicketLanguageJobData>;

  private transferTicketQueue: Queue<TransferTicketJobData>;

  constructor() {
    if (process.env.ENABLE_TICKET_LANGUAGE_DETECT) {
      console.log(`[TicketService] Ticket language detect enabled`);
      this.detectLangQueue = createQueue('ticket_language_detect', {
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: 1000, // 仅保留 1000 个失败任务
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      });
      this.detectLangQueue.process((job) => {
        return this.detectTicketLanguage(job);
      });
    }

    this.transferTicketQueue = createQueue('ticket_transfer');
    this.transferTicketQueue.process((job) => {
      return this.processTransferTicketJob(job);
    });
  }

  async getReplies(
    ticketId: string,
    options: GetRepliesOptions & { count: true }
  ): Promise<[Reply[], number]>;
  async getReplies(ticketId: string, options?: GetRepliesOptions): Promise<Reply[]>;
  async getReplies(ticketId: string, options: GetRepliesOptions = {}) {
    const query = Reply.queryBuilder();
    query.where('ticket', '==', Ticket.ptr(ticketId));
    if (options.author) {
      query.preload('author');
    }
    if (options.files) {
      query.preload('files');
    }
    if (!options.internal) {
      query.where('internal', '!=', true);
    }
    if (!options.deleted) {
      query.where('deletedAt', 'not-exists');
    }
    if (options.cursor) {
      if (options.desc) {
        query.where('createdAt', '<', options.cursor);
      } else {
        query.where('createdAt', '>', options.cursor);
      }
    } else if (options.skip) {
      query.skip(options.skip);
    }
    query.limit(options.limit ?? 10);
    query.orderBy('createdAt', options.desc ? 'desc' : 'asc');
    if (options.count) {
      return query.findAndCount({ useMasterKey: true });
    }
    return query.find({ useMasterKey: true });
  }

  async getOpsLogs(ticketId: string, options: GetOpsLogsOptions = {}) {
    const query = OpsLog.queryBuilder()
      .where('ticket', '==', Ticket.ptr(ticketId))
      .limit(options.limit || 10)
      .orderBy('createdAt', options.desc ? 'desc' : 'asc');
    if (options.actions?.length) {
      query.where('action', 'in', options.actions);
    }
    if (options.cursor) {
      if (options.desc) {
        query.where('createdAt', '<', options.cursor);
      } else {
        query.where('createdAt', '>', options.cursor);
      }
    } else if (options.skip) {
      query.skip(options.skip);
    }
    return query.find({ useMasterKey: true });
  }

  async isTicketEvaluable(ticket: Ticket) {
    if (!ticket.closedAt) {
      return true;
    }
    const evaluationConfig = (await Config.get('evaluation')) as
      | {
          timeLimit: number;
        }
      | undefined;
    if (!evaluationConfig || !evaluationConfig.timeLimit) {
      return true;
    }
    return differenceInMilliseconds(new Date(), ticket.closedAt) <= evaluationConfig.timeLimit;
  }

  async detectTicketLanguage(job: Job<DetectTicketLanguageJobData>) {
    const { ticketId } = job.data;
    const ticket = await Ticket.find(ticketId, { useMasterKey: true });
    if (!ticket) {
      return;
    }

    const text = ticket.content.trim() || ticket.title.trim();
    if (!text) {
      return;
    }

    const start = performance.now();
    let translateResult;
    try{
      translateResult = await translateService.translate(text);
    } finally {
      const end = performance.now();
      console.log(`[TicketService] detecting language for ticket ${ticket.nid}: ${text}, result: ${translateResult?.from}, attempts: ${job.attemptsMade}, time: ${end - start}ms`);
    }

    if (!translateResult) {
      return;
    }

    let language = translateResult.from;
    if (!allowedTicketLanguages.includes(language)) {
      return;
    }

    if (language === 'zh') {
      if (simpleToTradition(text) === text) {
        language = 'zh-Hant';
      } else {
        language = 'zh-Hans';
      }
    }

    await ticket.update({ language }, { useMasterKey: true });
    await searchTicketService.addSyncJob([ticket.id])
  }

  async addDetectTicketLanguageJob(ticketId: string) {
    if (this.detectLangQueue) {
      await this.detectLangQueue.add({ ticketId });
    }
  }

  async addTransferTicketJob(data: TransferTicketJobData) {
    await this.transferTicketQueue.add(data);
  }

  private async processTransferTicketJob(job: Job<TransferTicketJobData>) {
    const { sourceUserId, targetUserId } = job.data;

    const tickets = await Ticket.queryBuilder()
      .where('author', '==', User.ptr(sourceUserId))
      .includeACL(true)
      .limit(50)
      .find({ useMasterKey: true });

    if (tickets.length === 0) {
      if (job.data.mergeUserTaskId) {
        userService.transferTicketsCallback(job.data.mergeUserTaskId);
      }
      return;
    }

    await Ticket.updateSome(
      tickets.map((ticket) => {
        const ACL = new ACLBuilder(ticket.getRawACL() || {});
        ACL.disallow(sourceUserId, 'read', 'write');
        ACL.allow(targetUserId, 'read', 'write');
        return [ticket, { ACL: ACL, authorId: targetUserId }];
      }),
      {
        useMasterKey: true,
      }
    );

    await this.transferTicketQueue.add(job.data, {
      delay: 2000,
    });
  }
}

export const ticketService = new TicketService();
