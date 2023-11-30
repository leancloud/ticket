import { differenceInMilliseconds } from 'date-fns';

import { Config } from '@/config';
import { Ticket } from '@/model/Ticket';
import { Reply } from '@/model/Reply';

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
}

export const ticketService = new TicketService();
