import _ from 'lodash';
import xss from '@/utils/xss';
import { Ticket } from '@/model/Ticket';
import { FileResponse } from './file';
import { GroupResponse } from './group';
import { UserResponse } from './user';

export interface TicketResponseOptions {
  includeMetaKeys?: string[];
}

class BaseTicketResponse {
  constructor(readonly ticket: Ticket) {}

  toJSON({ includeMetaKeys = [] }: TicketResponseOptions = {}) {
    return {
      id: this.ticket.id,
      nid: this.ticket.nid,
      title: this.ticket.title,
      categoryId: this.ticket.categoryId,
      categoryPath: this.ticket.categoryPath?.map(({ id, name }) => ({ id, name })),
      authorId: this.ticket.authorId,
      author: this.ticket.author ? new UserResponse(this.ticket.author) : undefined,
      assigneeId: this.ticket.assigneeId,
      assignee: this.ticket.assignee ? new UserResponse(this.ticket.assignee) : undefined,
      groupId: this.ticket.groupId,
      group: this.ticket.group ? new GroupResponse(this.ticket.group) : undefined,
      files: this.ticket.files?.map((file) => new FileResponse(file)),
      status: this.ticket.status,
      evaluation: this.ticket.evaluation,
      replyCount: this.ticket.replyCount,
      metaData: this.ticket.metaData ? _.pick(this.ticket.metaData, includeMetaKeys) : undefined,
      createdAt: this.ticket.createdAt.toISOString(),
      updatedAt: this.ticket.updatedAt.toISOString(),
    };
  }
}

export class TicketListItemResponse extends BaseTicketResponse {
  toJSON(options?: TicketResponseOptions) {
    return {
      ...super.toJSON(options),
      unreadCount: this.ticket.notification ? this.ticket.notification.unreadCount : undefined,
    };
  }
}

export class TicketResponse extends BaseTicketResponse {
  toJSON() {
    return {
      ...super.toJSON(),
      metaData: this.ticket.metaData,
      contentSafeHTML: xss.process(this.ticket.contentHTML),
    };
  }
}
