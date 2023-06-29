import _ from 'lodash';
import { sanitize } from '@/utils/xss';
import { Ticket } from '@/model/Ticket';
import { FileResponse } from './file';
import { GroupResponse } from './group';
import { UserResponse } from './user';

export interface TicketResponseOptions {
  includeMetaKeys?: string[];
  includeTags?: boolean;
  includePrivateTags?: boolean;
}

class BaseTicketResponse {
  constructor(readonly ticket: Ticket) {}

  toJSON({ includeMetaKeys = [], includePrivateTags, includeTags }: TicketResponseOptions = {}) {
    return {
      id: this.ticket.id,
      nid: this.ticket.nid,
      title: this.ticket.title,
      categoryId: this.ticket.categoryId,
      categoryPath: this.ticket.categoryPath?.map(({ id, name }) => ({ id, name })),
      authorId: this.ticket.authorId,
      author: this.ticket.author ? new UserResponse(this.ticket.author) : undefined,
      reporterId: this.ticket.reporterId,
      reporter: this.ticket.reporter ? new UserResponse(this.ticket.reporter) : undefined,
      assigneeId: this.ticket.assigneeId,
      assignee: this.ticket.assignee ? new UserResponse(this.ticket.assignee) : undefined,
      groupId: this.ticket.groupId,
      group: this.ticket.group ? new GroupResponse(this.ticket.group) : undefined,
      files: this.ticket.files?.map((file) => new FileResponse(file)),
      status: this.ticket.status,
      evaluation: this.ticket.evaluation,
      replyCount: this.ticket.replyCount,
      metaData: this.ticket.metaData ? _.pick(this.ticket.metaData, includeMetaKeys) : undefined,
      firstCustomerServiceReplyAt: this.ticket.firstCustomerServiceReplyAt,
      latestCustomerServiceReplyAt: this.ticket.latestCustomerServiceReplyAt,
      associated: !!this.ticket.parentId,
      language: this.ticket.language,
      tags: includeTags ? this.ticket.tags : undefined,
      privateTags: includePrivateTags ? this.ticket.privateTags : undefined,
      createdAt: this.ticket.createdAt.toISOString(),
      updatedAt: this.ticket.updatedAt.toISOString(),
    };
  }
}

export class TicketListItemResponse extends BaseTicketResponse {
  toJSON(options?: TicketResponseOptions) {
    return {
      ...super.toJSON(options),
      // 因为限定 notification.user 为当前用户，所以 notifications 最多只有一个元素
      unreadCount: this.ticket.notifications?.[0]?.unreadCount,
    };
  }
}

export class TicketResponse extends BaseTicketResponse {
  toJSON(options?: TicketResponseOptions) {
    return {
      ...super.toJSON(options),
      metaData: this.ticket.metaData,
      contentSafeHTML: sanitize(this.ticket.contentHTML),
    };
  }
}
