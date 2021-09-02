import { TicketFilter } from '../model/ticket-filter';

export class TicketFilterResponse {
  constructor(readonly ticketFilter: TicketFilter) {}

  toJSON() {
    return {
      id: this.ticketFilter.id,
      name: this.ticketFilter.name,
      userIds: this.ticketFilter.userIds ?? undefined,
      groupIds: this.ticketFilter.groupIds ?? undefined,
      filters: this.ticketFilter.filters,
    };
  }
}
