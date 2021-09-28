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
  handlers[event]?.forEach((h) => {
    try {
      h(ctx);
    } catch {}
  });
}

export default { on, emit };
