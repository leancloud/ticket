import { Ticket } from '../model/ticket';
import { GroupJson } from './group';
import { UserJson } from './user';

export class TicketListItemJson {
  constructor(readonly ticket: Ticket) {}

  toJSON() {
    return {
      id: this.ticket.id,
      nid: this.ticket.nid,
      title: this.ticket.title,
      categoryId: this.ticket.categoryId,
      authorId: this.ticket.authorId,
      author: this.ticket.author ? new UserJson(this.ticket.author) : undefined,
      assigneeId: this.ticket.assigneeId,
      assignee: this.ticket.assignee ? new UserJson(this.ticket.assignee) : undefined,
      groupId: this.ticket.groupId,
      group: this.ticket.group ? new GroupJson(this.ticket.group) : undefined,
      status: this.ticket.status,
      createdAt: this.ticket.createdAt.toISOString(),
      updatedAt: this.ticket.updatedAt.toISOString(),
    };
  }
}
