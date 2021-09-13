import xss from '../utils/xss';
import { Ticket } from '../model/Ticket';
import { FileResponse } from './file';
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
      categoryPath: this.ticket.categoryPath?.map(({ id, name }) => ({ id, name })),
      authorId: this.ticket.authorId,
      author: this.ticket.author ? new UserJson(this.ticket.author) : undefined,
      assigneeId: this.ticket.assigneeId,
      assignee: this.ticket.assignee ? new UserJson(this.ticket.assignee) : undefined,
      groupId: this.ticket.groupId,
      group: this.ticket.group ? new GroupJson(this.ticket.group) : undefined,
      files: this.ticket.files?.map((file) => new FileResponse(file)),
      status: this.ticket.status,
      evaluation: this.ticket.evaluation,
      replyCount: this.ticket.replyCount,
      createdAt: this.ticket.createdAt.toISOString(),
      updatedAt: this.ticket.updatedAt.toISOString(),
    };
  }
}

export class TicketJSON {
  constructor(readonly ticket: Ticket) {}

  toJSON() {
    return {
      ...new TicketListItemJson(this.ticket).toJSON(),
      metaData: this.ticket.metaData,
      contentSafeHTML: xss.process(this.ticket.contentHTML),
    };
  }
}
