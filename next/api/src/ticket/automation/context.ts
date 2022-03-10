import _ from 'lodash';

import { Category } from '@/model/Category';
import { Group } from '@/model/Group';
import { Tag, Ticket } from '@/model/Ticket';
import { User, systemUser } from '@/model/User';
import { TicketUpdater } from '@/ticket';

export interface DirtyData {
  categoryId?: string;
  assigneeId?: string | null;
  groupId?: string | null;
  status?: number;
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

  closeTicket() {
    this.dirtyData.status = Ticket.Status.CLOSED;
    this.updater.operate('close');
  }

  addTag(tag: Tag) {
    this.updater.addTag(tag);
  }

  addPrivateTag(tag: Tag) {
    this.updater.addPrivateTag(tag);
  }

  getMetaData() {
    return this.ticket.metaData;
  }

  async finish() {
    await this.updater.update(systemUser, { ignoreTrigger: true });
  }
}
