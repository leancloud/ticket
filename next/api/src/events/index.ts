import EventEmitter from 'eventemitter3';

export interface Ticket {
  id: string;
  nid: number;
  categoryId: string;
  authorId: string;
  organizationId?: string;
  assigneeId?: string;
  groupId?: string;
  title: string;
  content: string;
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

export interface Reply {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  isCustomerService: boolean;
  internal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCreatedCtx {
  ticket: Ticket;
  currentUserId: string;
}

export interface TicketUpdatedCtx {
  originalTicket: Ticket;
  data: UpdateData;
  currentUserId: string;
}

export interface ReplyCreatedCtx {
  reply: Reply;
  currentUserId: string;
}

export interface EventTypes {
  'ticket:created': (ctx: TicketCreatedCtx) => void;
  'ticket:updated': (ctx: TicketUpdatedCtx) => void;
  'reply:created': (ctx: ReplyCreatedCtx) => void;
}

const events = new EventEmitter<EventTypes>();

if (process.env.NODE_ENV !== 'production') {
  events.on('ticket:created', (ctx) => console.log('[Events] ticket:created', ctx));
  events.on('ticket:updated', (ctx) => console.log('[Events] ticket:updated', ctx));
  events.on('reply:created', (ctx) => console.log('[Events] reply:created', ctx));
}

export default events;
