import { Ticket } from '@/model/Ticket';
import { Reply } from '@/model/Reply';

import { Context } from '../context';

export type TriggerEvent = 'created' | 'updated' | 'replied';

export interface UpdatedData {
  categoryId?: string;
  organizationId?: string | null;
  assigneeId?: string | null;
  groupId?: string | null;
  evaluation?: { star: number; content: string };
  status?: number;
}

export interface TriggerContextConfig {
  ticket: Ticket;
  event: TriggerEvent;
  currentUserId: string;
  updatedData?: UpdatedData;
  reply?: Reply;
}

export class TriggerContext extends Context {
  readonly event: TriggerEvent;
  readonly currentUserId: string;

  protected updatedData?: UpdatedData;
  protected reply?: Reply;

  constructor(config: TriggerContextConfig) {
    super(config.ticket);
    this.event = config.event;
    this.currentUserId = config.currentUserId;
    if (config.updatedData) {
      this.updatedData = config.updatedData;
    }
    if (config.reply) {
      this.reply = config.reply;
    }
  }

  getCategoryId(): string {
    return this.dirtyData.categoryId ?? this.updatedData?.categoryId ?? this.ticket.categoryId;
  }

  getAssigneeId(): string | null {
    if (this.dirtyData.assigneeId !== undefined) {
      return this.dirtyData.assigneeId;
    }
    if (this.updatedData?.assigneeId !== undefined) {
      return this.updatedData.assigneeId;
    }
    return this.ticket.assigneeId ?? null;
  }

  getGroupId(): string | null {
    if (this.dirtyData.groupId !== undefined) {
      return this.dirtyData.groupId;
    }
    if (this.updatedData?.groupId) {
      return this.updatedData.groupId;
    }
    return this.ticket.groupId ?? null;
  }

  getStatus(): number {
    return this.dirtyData.status ?? this.updatedData?.status ?? this.ticket.status;
  }
}
