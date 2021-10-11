import { TicketFilter } from '@/model/TicketFilter';

export class TicketFilterResponse {
  constructor(readonly ticketFilter: TicketFilter) {}

  toJSON() {
    return {
      id: this.ticketFilter.id,
      name: this.ticketFilter.name,
      userIds: this.ticketFilter.userIds,
      groupIds: this.ticketFilter.groupIds,
      filters: this.ticketFilter.filters,
    };
  }
}
