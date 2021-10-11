import type { Reply } from '../model/Reply';
import type { Ticket } from '../model/Ticket';
import type { User } from '../model/User';

export interface NewTicketContext {
  ticket: Ticket;
  from: User;
  to?: User;
}

export interface ReplyTicketContext extends NewTicketContext {
  reply: Reply;
}

export interface ChangeAssigneeContext extends NewTicketContext {}

export interface DelayNotifyContext extends NewTicketContext {}

export interface TicketEvaluationContext extends NewTicketContext {}

export interface ChangeStatusContext extends NewTicketContext {}

export interface EventHandler {
  newTicket: (ctx: NewTicketContext) => void;
  replyTicket: (ctx: ReplyTicketContext) => void;
  changeAssignee: (ctx: ChangeAssigneeContext) => void;
  delayNotify: (ctx: DelayNotifyContext) => void;
  ticketEvaluation: (ctx: TicketEvaluationContext) => void;
  changeStatus: (ctx: ChangeStatusContext) => void;
}

export type EventType = keyof EventHandler;

const handlers: Record<string, ((ctx: any) => void)[]> = {};

function on<E extends EventType>(event: E, handler: EventHandler[E]) {
  handlers[event] ??= [];
  handlers[event]!.push(handler);
}

function emit<E extends EventType>(event: E, ctx: Parameters<EventHandler[E]>[0]) {
  const errors: Error[] = [];
  handlers[event]?.forEach((h) => {
    try {
      h(ctx);
    } catch (error) {
      errors.push(error as Error);
    }
  });
  if (errors.length) {
    const error = new Error(errors.map((e) => e.message).join('; '));
    (error as any).errors = errors;
    throw error;
  }
}

async function tryToGetTicketAssignee(ticket: Ticket): Promise<User | undefined> {
  if (ticket.assigneeId) {
    const assignee = await ticket.load('assignee', { useMasterKey: true });
    if (!assignee) {
      console.warn(`[WARN] User ${ticket.assigneeId} is not exists`);
    }
    return assignee;
  }
}

export function notifyNewTicket(ticket: Ticket) {
  const task = async () => {
    const author = await ticket.load('author', { useMasterKey: true });
    if (!author) {
      throw new Error(`Author ${ticket.authorId} is not exists`);
    }
    const assignee = await tryToGetTicketAssignee(ticket);
    emit('newTicket', { ticket, from: author, to: assignee });
  };
  task().catch((error) => {
    // TODO: Sentry
    console.error(`[ERROR] Send new ticket notification failed, error:`, error);
  });
}

export function notifyChangeAssignee(ticket: Ticket, from: User) {
  const task = async () => {
    const assignee = await tryToGetTicketAssignee(ticket);
    emit('changeAssignee', { ticket, from, to: assignee });
  };
  task().catch((error) => {
    // TODO: Sentry
    console.error(`[ERROR] Send change assignee notification failed, error:`, error);
  });
}

export function notifyTicketEvaluation(ticket: Ticket, from: User) {
  const task = async () => {
    const assignee = await tryToGetTicketAssignee(ticket);
    emit('ticketEvaluation', { ticket, from, to: assignee });
  };
  task().catch((error) => {
    // TODO: Sentry
    console.error(`[ERROR] Send ticket evaluation notification failed, error:`, error);
  });
}

export default { on, emit };
