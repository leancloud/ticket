import { TicketStats } from '@/model/TicketStats';
import { TicketStatusStats } from '@/model/TicketStatusStats';

export interface EvaluationCounts {
  likeCount: number;
  dislikeCount: number;
  likeRate: number;
  dislikeRate: number;
}

export interface EvaluationStats extends Omit<EvaluationCounts, 'likeRate' | 'dislikeRate'> {
  categoryId?: string;
  customerServiceId?: string;
  selection?: string;
}

export class TicketStatsResponse {
  constructor(readonly ticketStats: TicketStats) {}
  toJSON() {
    return {
      id: this.ticketStats.id,
      date: this.ticketStats.date,
      created: this.ticketStats.created || 0,
      closed: this.ticketStats.closed || 0,
      reopened: this.ticketStats.reopened || 0,
      conversion: this.ticketStats.conversion || 0,
      internalConversion: this.ticketStats.internalConversion || 0,
      externalConversion: this.ticketStats.externalConversion || 0,
      replyTime: this.ticketStats.replyTime || 0,
      replyTimeCount: this.ticketStats.replyTimeCount || 0,
      replyCount: this.ticketStats.replyCount || 0,
      firstReplyTime: this.ticketStats.firstReplyTime || 0,
      firstReplyCount: this.ticketStats.firstReplyCount || 0,
      internalReplyCount: this.ticketStats.internalReplyCount || 0,
      naturalReplyTime: this.ticketStats.naturalReplyTime || 0,
      naturalReplyCount: this.ticketStats.naturalReplyCount || 0,
      likeCount: this.ticketStats.likeCount || 0,
      dislikeCount: this.ticketStats.dislikeCount || 0,
    };
  }
}

export class TicketStatusStatsResponse {
  constructor(readonly ticketStats: TicketStatusStats) {}
  toJSON() {
    return {
      id: this.ticketStats.id,
      date: this.ticketStats.date,
      notProcessed: this.ticketStats.notProcessed || 0,
      waitingCustomer: this.ticketStats.waitingCustomer || 0,
      waitingCustomerService: this.ticketStats.waitingCustomerService || 0,
      preFulfilled: this.ticketStats.preFulfilled || 0,
      fulfilled: this.ticketStats.fulfilled || 0,
      closed: this.ticketStats.closed || 0,
    };
  }
}
