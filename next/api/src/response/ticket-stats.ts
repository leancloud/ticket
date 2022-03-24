
import { TicketStats } from '@/model/TicketStats';
import { TicketStatusStats } from '@/model/TicketStatusStats';
export class TicketStatsResponse {
  constructor(readonly ticketStats: TicketStats) { }
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
      naturalReplyCount: this.ticketStats.naturalReplyCount || 0
    };
  }
}

export class TicketStatusStatsResponse {
  constructor(readonly ticketStats: TicketStatusStats) { }
  toJSON() {
    return {
      id: this.ticketStats.id,
      date: this.ticketStats.date,
      accepted: this.ticketStats.accepted || 0,
      waiting: this.ticketStats.waiting || 0,
    };
  }
}