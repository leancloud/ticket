import _ from 'lodash';

import { Category } from '@/model/Category';
import { Group } from '@/model/Group';
import { Reply } from '@/model/Reply';
import { Ticket } from '@/model/Ticket';
import { User, systemUser } from '@/model/User';
import { TicketUpdater } from '@/ticket';

export type TicketEvent = 'created' | 'updated' | 'replied';

export interface UpdatedData {
  categoryId?: string;
  organizationId?: string | null;
  assigneeId?: string | null;
  groupId?: string | null;
  evaluation?: { star: number; content: string };
  status?: number;
}

export class Context {
  protected updatedData?: UpdatedData;
  protected reply?: Reply;
  protected updater: TicketUpdater;

  constructor(readonly event: TicketEvent, private ticket: Ticket, readonly currentUserId: string) {
    this.updater = new TicketUpdater(ticket);
  }

  private setUpdatedData<K extends keyof UpdatedData>(key: K, value: Required<UpdatedData>[K]) {
    if (this.updatedData) {
      this.updatedData[key] = value;
    } else {
      this.updatedData = { [key]: value };
    }
  }

  getTitle(): string {
    return this.ticket.title;
  }

  getContent(): string {
    return this.ticket.content;
  }

  getCategoryId(): string {
    return this.updatedData?.categoryId ?? this.ticket.categoryId;
  }

  async setCategoryId(id: string) {
    const category = await Category.find(id);
    if (!category) {
      return;
    }

    this.setUpdatedData('categoryId', id);
    this.updater.setCategory(category);
  }

  getAuthorId(): string {
    return this.ticket.authorId;
  }

  getAssigneeId(): string | null {
    if (this.updatedData?.assigneeId !== undefined) {
      return this.updatedData.assigneeId;
    }
    return this.ticket.assigneeId ?? null;
  }

  async setAssigneeId(id: string | null) {
    if (id === null) {
      this.setUpdatedData('assigneeId', id);
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

    this.setUpdatedData('assigneeId', id);
    this.updater.setAssignee(user);
  }

  getGroupId(): string | null {
    if (this.updatedData?.groupId !== undefined) {
      return this.updatedData.groupId;
    }
    return this.ticket.groupId ?? null;
  }

  async setGroupId(id: string | null) {
    if (id === null) {
      this.setUpdatedData('groupId', null);
      this.updater.setGroup(null);
      return;
    }

    const group = await Group.find(id, { useMasterKey: true });
    if (!group) {
      return;
    }

    this.setUpdatedData('groupId', id);
    this.updater.setGroup(group);
  }

  getStatus(): number {
    return this.updatedData?.status ?? this.ticket.status;
  }

  closeTicket() {
    this.setUpdatedData('status', Ticket.STATUS.CLOSED);
    this.updater.operate('close');
  }

  async finish() {
    await this.updater.update(systemUser, { ignoreTrigger: true });
  }
}
