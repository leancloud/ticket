import xss from '../utils/xss';
import { Ticket } from '../model/ticket';
import { FileResponse } from './file';
import { GroupJson } from './group';
import { UserJson } from './user';

// XXX: 临时提供给 DC 使用，不过只用到了 author.name 和 content
function encodeLatestReply(latestReply: any) {
  return {
    author: {
      id: latestReply.author.objectId,
      username: latestReply.author.username,
      name: latestReply.author.name,
      email: latestReply.author.email,
    },
    content: latestReply.content,
    is_customer_service: latestReply.isCustomerService,
    created_at: latestReply.createdAt,
  };
}

export class TicketListItemJson {
  constructor(readonly ticket: Ticket) {}

  toJSON() {
    return {
      id: this.ticket.id,
      nid: this.ticket.nid,
      title: this.ticket.title,
      categoryId: this.ticket.categoryId,
      categoryPath: this.ticket.categoryPath?.map(({ id, name }) => ({
        id,
        name,
      })),
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
      latest_reply: this.ticket.latestReply
        ? encodeLatestReply(this.ticket.latestReply)
        : undefined,
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
