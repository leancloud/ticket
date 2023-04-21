import _ from 'lodash';

import { Category } from '@/model/Category';
import { Group } from '@/model/Group';
import { Tag, Ticket } from '@/model/Ticket';
import { User, systemUser } from '@/model/User';
import { TicketUpdater } from '@/ticket';
import { OperateAction } from '@/model/OpsLog';

export interface DirtyData {
  categoryId?: string;
  assigneeId?: string | null;
  groupId?: string | null;
  status?: number;
  tags?: Tag[];
  privateTags?: Tag[];
}

export class Context {
  protected dirtyData: DirtyData = {};
  protected updater: TicketUpdater;

  constructor(protected ticket: Ticket) {
    this.updater = new TicketUpdater(ticket);
  }

  getTitle(): string {
    return this.ticket.title;
  }

  getContent(): string {
    return this.ticket.content;
  }

  getCategoryId(): string {
    return this.dirtyData.categoryId ?? this.ticket.categoryId;
  }

  async setCategoryId(id: string) {
    const category = await Category.find(id);
    if (!category) {
      return;
    }

    this.dirtyData.categoryId = id;
    this.updater.setCategory(category);
  }

  getAuthorId(): string {
    return this.ticket.authorId;
  }

  getAssigneeId(): string | null {
    if (this.dirtyData.assigneeId !== undefined) {
      return this.dirtyData.assigneeId;
    }
    return this.ticket.assigneeId ?? null;
  }

  async setAssigneeId(id: string | null) {
    if (id === null) {
      this.dirtyData.assigneeId = null;
      this.updater.setAssignee(null);
      return;
    }

    const user = await User.find(id, { useMasterKey: true });
    if (!user) {
      return;
    }

    const isCustomerService = await User.isCustomerService(user);
    if (!isCustomerService) {
      return;
    }

    this.dirtyData.assigneeId = id;
    this.updater.setAssignee(user);
  }

  getGroupId(): string | null {
    if (this.dirtyData.groupId !== undefined) {
      return this.dirtyData.groupId;
    }
    return this.ticket.groupId ?? null;
  }

  async setGroupId(id: string | null) {
    if (id === null) {
      this.dirtyData.groupId = null;
      this.updater.setGroup(null);
      return;
    }

    const group = await Group.find(id, { useMasterKey: true });
    if (!group) {
      return;
    }

    this.dirtyData.groupId = id;
    this.updater.setGroup(group);
  }

  getStatus(): number {
    return this.dirtyData.status ?? this.ticket.status;
  }

  changeStatus(action: OperateAction) {
    switch (action) {
      case 'replyWithNoContent':
        this.dirtyData.status = Ticket.Status.WAITING_CUSTOMER;
        break;
      case 'replySoon':
        this.dirtyData.status = Ticket.Status.WAITING_CUSTOMER_SERVICE;
        break;
      case 'resolve':
        this.dirtyData.status = Ticket.Status.PRE_FULFILLED;
        break;
      case 'close':
        this.dirtyData.status = Ticket.Status.CLOSED;
        break;
      case 'reopen':
        this.dirtyData.status = Ticket.Status.WAITING_CUSTOMER;
        break;
    }
    this.updater.operate(action);
  }

  closeTicket() {
    return this.changeStatus('close');
  }

  getTags() {
    return this.dirtyData.tags ?? this.ticket.tags;
  }

  addTag(tag: Tag) {
    if (!this.dirtyData.tags) {
      this.dirtyData.tags = this.ticket.tags?.slice() ?? [];
    }
    this.dirtyData.tags.push(tag);
    this.updater.addTag(tag);
  }

  getPrivateTags() {
    return this.dirtyData.privateTags ?? this.ticket.privateTags;
  }

  addPrivateTag(tag: Tag) {
    if (!this.dirtyData.privateTags) {
      this.dirtyData.privateTags = this.ticket.privateTags?.slice() ?? [];
    }
    this.dirtyData.privateTags.push(tag);
    this.updater.addPrivateTag(tag);
  }

  getMetaData() {
    return this.ticket.metaData;
  }

  getLanguage() {
    return this.ticket.language ?? null;
  }

  async finish() {
    await this.updater.update(systemUser, { ignoreTrigger: true });
  }
}
