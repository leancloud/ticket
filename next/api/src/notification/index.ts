import EventEmitter from 'eventemitter3';

import { createQueue } from '@/queue';
import events from '@/events';
import { Notification, Notification as NotificationModel } from '@/model/Notification';
import { Reply } from '@/model/Reply';
import { Evaluation, Ticket } from '@/model/Ticket';
import { User, systemUser } from '@/model/User';

export interface NewTicketContext {
  ticket: Ticket;
  from: User;
  to?: User;
}

export interface ReplyTicketContext extends NewTicketContext {
  reply: Reply;
}

export interface InternalReplyContext extends ReplyTicketContext {}

export interface ChangeAssigneeContext extends NewTicketContext {}

export interface DelayNotifyContext extends NewTicketContext {}

export interface TicketEvaluationContext extends NewTicketContext {}

export interface ChangeStatusContext extends NewTicketContext {
  originalStatus: number;
  status: number;
}

export interface TicketExportedContext {
  to: User;
  downloadUrl: string;
}

export interface EventHandler {
  newTicket: (ctx: NewTicketContext) => void;
  replyTicket: (ctx: ReplyTicketContext) => void;
  internalReply: (ctx: InternalReplyContext) => void;
  changeAssignee: (ctx: ChangeAssigneeContext) => void;
  delayNotify: (ctx: DelayNotifyContext) => void;
  ticketEvaluation: (ctx: TicketEvaluationContext) => void;
  changeStatus: (ctx: ChangeStatusContext) => void;
  ticketExported: (ctx: TicketExportedContext) => void;
}

export interface NewTicketJobData {
  type: 'newTicket';
  ticketId: string;
  // ticket.assigneeId 可能会被修改，这里要记录 ticket 创建时的 assigneeId
  assigneeId?: string;
}

export interface ReplyTicketJobData {
  type: 'replyTicket';
  replyId: string;
}

export interface InternalReplyJobData {
  type: 'internalReply';
  replyId: string;
}

export interface ChangeAssigneeJobData {
  type: 'changeAssignee';
  ticketId: string;
  operatorId: string;
  assigneeId: string | null;
}

export interface DelayNotifyJobData {
  type: 'delayNotify';
  ticketId: string;
}

export interface TicketEvaluationJobData {
  type: 'ticketEvaluation';
  ticketId: string;
  operatorId: string;
  evaluation: Evaluation;
}

export interface ChangeStatusJobData {
  type: 'changeStatus';
  ticketId: string;
  operatorId: string;
  originalStatus: number;
  status: number;
}

export interface TicketExportedJobData {
  type: 'ticketExported';
  downloadUrl: string;
  userId: string;
}

type JobData =
  | NewTicketJobData
  | ReplyTicketJobData
  | InternalReplyJobData
  | ChangeAssigneeJobData
  | DelayNotifyJobData
  | TicketEvaluationJobData
  | ChangeStatusJobData
  | TicketExportedJobData;

class NotificationEE extends EventEmitter<EventHandler> {
  register(channel: Partial<EventHandler>) {
    Object.entries(channel).forEach(([e, h]) => this.on(e as any, h));
  }

  notifyNewTicket(data: Omit<NewTicketJobData, 'type'>) {
    queue.add({ type: 'newTicket', ...data });
  }

  notifyReplyTicket(data: Omit<ReplyTicketJobData, 'type'>) {
    queue.add({ type: 'replyTicket', ...data });
  }

  notifyInternalReply(data: Omit<InternalReplyJobData, 'type'>) {
    queue.add({ type: 'internalReply', ...data });
  }

  notifyChangeAssignee(data: Omit<ChangeAssigneeJobData, 'type'>) {
    queue.add({ type: 'changeAssignee', ...data });
  }

  notifyDelayNotify(data: Omit<DelayNotifyJobData, 'type'>) {
    queue.add({ type: 'delayNotify', ...data });
  }

  notifyTicketEvaluation(data: Omit<TicketEvaluationJobData, 'type'>) {
    queue.add({ type: 'ticketEvaluation', ...data });
  }

  notifyChangeStatus(data: Omit<ChangeStatusJobData, 'type'>) {
    queue.add({ type: 'changeStatus', ...data });
  }

  notifyTicketExported(data: Omit<TicketExportedJobData, 'type'>) {
    queue.add({ type: 'ticketExported', ...data });
  }

  async processNewTicket({ ticketId, assigneeId }: NewTicketJobData) {
    const ticket = await Ticket.find(ticketId, { useMasterKey: true });
    if (!ticket) return;

    const author = await ticket.load('author', { useMasterKey: true });
    if (!author) return;

    let assignee: User | undefined;
    if (assigneeId) {
      assignee = await User.find(assigneeId, { useMasterKey: true });
    }

    this.emit('newTicket', { ticket, from: author, to: assignee });
  }

  async processReplyTicket({ replyId }: ReplyTicketJobData) {
    const reply = await Reply.find(replyId, { useMasterKey: true });
    if (!reply) return;

    const author = await reply.load('author', { useMasterKey: true });
    if (!author) return;

    const ticket = await reply.load('ticket', { useMasterKey: true });
    if (!ticket) return;

    let to: User | undefined;
    if (reply.isCustomerService) {
      to = await ticket.load('author', { useMasterKey: true });
    } else if (ticket.assigneeId) {
      to = await ticket.load('assignee', { useMasterKey: true });
    }

    this.emit('replyTicket', { ticket, reply, from: author, to });
  }

  async processInternalReply({ replyId }: InternalReplyJobData) {
    const reply = await Reply.find(replyId, { useMasterKey: true });
    if (!reply) return;

    const author = await reply.load('author', { useMasterKey: true });
    if (!author) return;

    const ticket = await reply.load('ticket', { useMasterKey: true });
    if (!ticket) return;

    let to: User | undefined;
    if (ticket.assigneeId) {
      to = await ticket.load('assignee', { useMasterKey: true });
    }

    this.emit('internalReply', { ticket, reply, from: author, to });
  }

  async processChangeAssignee({ ticketId, operatorId, assigneeId }: ChangeAssigneeJobData) {
    const ticket = await Ticket.find(ticketId, { useMasterKey: true });
    if (!ticket) return;

    const operator = await User.findById(operatorId);
    if (!operator) return;

    let assignee: User | undefined;
    if (assigneeId) {
      assignee = await ticket.load('assignee', { useMasterKey: true });
    }

    this.emit('changeAssignee', { ticket, from: operator, to: assignee });
  }

  async processDelayNotify({ ticketId }: DelayNotifyJobData) {
    const ticket = await Ticket.find(ticketId, { useMasterKey: true });
    if (!ticket) return;

    let assignee: User | undefined;
    if (ticket.assigneeId) {
      assignee = await ticket.load('assignee', { useMasterKey: true });
    }

    this.emit('delayNotify', { ticket, from: systemUser, to: assignee });
  }

  async processTicketEvaluation({ ticketId, operatorId, evaluation }: TicketEvaluationJobData) {
    const ticket = await Ticket.find(ticketId, { useMasterKey: true });
    if (!ticket) return;
    ticket.evaluation = evaluation;

    const operator = await User.findById(operatorId);
    if (!operator) return;

    let assignee: User | undefined;
    if (ticket.assigneeId) {
      assignee = await ticket.load('assignee', { useMasterKey: true });
    }

    this.emit('ticketEvaluation', { ticket, from: operator, to: assignee });
  }

  async processChangeStatus({ ticketId, operatorId, originalStatus, status }: ChangeStatusJobData) {
    const ticket = await Ticket.find(ticketId, { useMasterKey: true });
    if (!ticket) return;

    const operator = await User.findById(operatorId);
    if (!operator) return;

    let assignee: User | undefined;
    if (ticket.assigneeId && ticket.assigneeId !== operatorId) {
      assignee = await ticket.load('assignee', { useMasterKey: true });
    }

    this.emit('changeStatus', { ticket, from: operator, to: assignee, originalStatus, status });
  }

  async processTicketExported(data: TicketExportedJobData) {
    const user = await User.findById(data.userId);
    if (!user) return;
    this.emit('ticketExported', {
      downloadUrl: data.downloadUrl,
      to: user,
    });
  }
}

const notification = new NotificationEE();

export default notification;

// 内置的通知逻辑
notification.register({
  newTicket: ({ ticket }) => {
    if (ticket.assigneeId) {
      NotificationModel.create({
        ACL: {
          [ticket.assigneeId]: { read: true, write: true },
        },
        latestAction: 'newTicket',
        latestActionAt: new Date(),
        ticketId: ticket.id,
        userId: ticket.assigneeId,
        unreadCount: 1,
      }).catch((error) => {
        // TODO: Sentry
        console.error(error);
      });
    }
  },
  replyTicket: ({ ticket, from }) => {
    ticket.increaseUnreadCount('reply', from).catch((error) => {
      // TODO: Sentry
      console.error(error);
    });
  },
  changeAssignee: ({ ticket, to }) => {
    if (to) {
      NotificationModel.upsertSome(ticket.id, [to.id], ticket.categoryId, 'changeAssignee').catch(
        (error) => {
          // TODO: Sentry
          console.error(error);
        }
      );
    }
  },
  ticketEvaluation: ({ ticket, to }) => {
    if (to) {
      NotificationModel.upsertSome(ticket.id, [to.id], ticket.categoryId, 'ticketEvaluation').catch(
        (error) => {
          // TODO: Sentry
          console.error(error);
        }
      );
    }
  },
});

const queue = createQueue<JobData>('notification', {
  limiter: {
    max: 100,
    duration: 5000,
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});

queue.process((job) => {
  switch (job.data.type) {
    case 'newTicket':
      return notification.processNewTicket(job.data);
    case 'replyTicket':
      return notification.processReplyTicket(job.data);
    case 'internalReply':
      return notification.processInternalReply(job.data);
    case 'changeAssignee':
      return notification.processChangeAssignee(job.data);
    case 'delayNotify':
      return notification.processDelayNotify(job.data);
    case 'ticketEvaluation':
      return notification.processTicketEvaluation(job.data);
    case 'changeStatus':
      return notification.processChangeStatus(job.data);
    case 'ticketExported':
      return notification.processTicketExported(job.data);
  }
});

events.on('ticket:created', ({ ticket }) => {
  notification.notifyNewTicket({
    ticketId: ticket.id,
    assigneeId: ticket.assigneeId,
  });
});

events.on('ticket:updated', ({ originalTicket, data, currentUserId }) => {
  if (data.categoryId) {
    Notification.updateCategory(originalTicket.id, data.categoryId).catch((error) => {
      // TODO: Sentry
      console.error(`[Notification] update category failed:`, error);
    });
  }

  if (data.assigneeId !== undefined) {
    notification.notifyChangeAssignee({
      ticketId: originalTicket.id,
      operatorId: currentUserId,
      assigneeId: data.assigneeId,
    });
  }

  if (data.evaluation) {
    notification.notifyTicketEvaluation({
      ticketId: originalTicket.id,
      operatorId: currentUserId,
      evaluation: data.evaluation,
    });
  }

  if (data.status) {
    notification.notifyChangeStatus({
      ticketId: originalTicket.id,
      operatorId: currentUserId,
      originalStatus: originalTicket.status,
      status: data.status,
    });
  }
});

events.on('reply:created', ({ reply }) => {
  if (reply.internal) {
    notification.notifyInternalReply({ replyId: reply.id });
  } else {
    notification.notifyReplyTicket({ replyId: reply.id });
  }
});
