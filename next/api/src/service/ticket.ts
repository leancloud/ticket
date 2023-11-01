import { differenceInMilliseconds } from 'date-fns';

import { Ticket } from '@/model/Ticket';
import { Config } from '@/config';

export class TicketService {
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
