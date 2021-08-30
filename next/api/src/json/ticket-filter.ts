import { TicketFilter } from '../model/ticket-filter';

export class TicketFilterResponse {
  constructor(readonly ticketFilter: TicketFilter) {}

  toJSON() {
    return {
      id: this.ticketFilter.id,
      name: this.ticketFilter.name,
      userId: this.ticketFilter.userId ?? undefined,
      groupId: this.ticketFilter.groupId ?? undefined,
      filters: this.ticketFilter.filters,
    };
  }
}
