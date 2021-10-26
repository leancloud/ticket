import { TicketUpdater } from '@/ticket';

export interface TicketSnapshot {
  id: string;
  nid: number;
  title: string;
  content: string;
  categoryId: string;
  authorId: string;
  organizationId?: string;
  assigneeId?: string;
  groupId?: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateData {
  categoryId?: string;
  organizationId?: string | null;
  assigneeId?: string | null;
  groupId?: string | null;
  evaluation?: { star: number; content: string };
  status?: number;
}

export interface ReplySnapshot {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  isCustomerService: boolean;
  internal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Context {
  type: 'ticketCreated' | 'ticketUpdated' | 'ticketReplied' | 'automation';
  ticket: TicketSnapshot;
  updatedData?: UpdateData;
  reply?: ReplySnapshot;
  currentUserId: string;
  updater: TicketUpdater;
}

export { Condition, condition } from './condition';
export { Action, action } from './action';
