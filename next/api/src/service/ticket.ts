import { differenceInMilliseconds } from 'date-fns';
import { simpleToTradition } from 'chinese-simple2traditional';

import { Config } from '@/config';
import { Ticket } from '@/model/Ticket';
import { Reply } from '@/model/Reply';
import { createQueue, Queue } from '@/queue';
import { DetectTicketLanguageJobData } from '@/interfaces/ticket';
import { allowedTicketLanguages } from '@/utils/locale';
import { translateService } from './translate';

interface GetRepliesOptions {
  author?: boolean;
  files?: boolean;
  internal?: boolean;
  deleted?: boolean;
  skip?: number;
  limit?: number;
  cursor?: Date;
  desc?: boolean;
  count?: boolean;
}

export class TicketService {
  private detectLangQueue?: Queue<DetectTicketLanguageJobData>;

  constructor() {
    if (process.env.ENABLE_TICKET_LANGUAGE_DETECT) {
      console.log(`[TicketService] Ticket language detect enabled`);
      this.detectLangQueue = createQueue('ticket_language_detect', {
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: true,
        },
      });
      this.detectLangQueue.process((job) => {
        return this.detectTicketLanguage(job.data.ticketId);
      });
    }
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

  async detectTicketLanguage(ticketId: string) {
    const ticket = await Ticket.find(ticketId, { useMasterKey: true });
    if (!ticket) {
      return;
    }

    const text = ticket.content.trim() || ticket.title.trim();
    if (!text) {
      return;
    }

    const translateResult = await translateService.translate(text);
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
  }

  async addDetectTicketLanguageJob(ticketId: string) {
    if (this.detectLangQueue) {
      await this.detectLangQueue.add({ ticketId });
    }
  }
}

export const ticketService = new TicketService();
