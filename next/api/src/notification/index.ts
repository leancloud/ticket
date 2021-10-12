import EventEmitter from 'eventemitter3';
import Queue from 'bull';

import events from '@/events';
import { Notification as NotificationModel } from '@/model/Notification';
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

export interface ChangeAssigneeContext extends NewTicketContext {}

export interface DelayNotifyContext extends NewTicketContext {}

export interface TicketEvaluationContext extends NewTicketContext {}

export interface ChangeStatusContext extends NewTicketContext {
  originalStatus: number;
  status: number;
}

export interface EventHandler {
  newTicket: (ctx: NewTicketContext) => void;
  replyTicket: (ctx: ReplyTicketContext) => void;
  changeAssignee: (ctx: ChangeAssigneeContext) => void;
  delayNotify: (ctx: DelayNotifyContext) => void;
  ticketEvaluation: (ctx: TicketEvaluationContext) => void;
  changeStatus: (ctx: ChangeStatusContext) => void;
}

export interface NewTicketJobData {
  ticketId: string;
  // ticket.assigneeId 可能会被修改，这里要记录 ticket 创建时的 assigneeId
  assigneeId?: string;
}

export interface ReplyTicketJobData {
  replyId: string;
}

export interface ChangeAssigneeJobData {
  ticketId: string;
  operatorId: string;
  assigneeId: string | null;
}

export interface DelayNotifyJobData {
  ticketId: string;
}

export interface TicketEvaluationJobData {
  ticketId: string;
  operatorId: string;
  evaluation: Evaluation;
}

export interface ChangeStatusJobData {
  ticketId: string;
  operatorId: string;
  originalStatus: number;
  status: number;
}

type JobData =
  | { type: 'newTicket'; data: NewTicketJobData }
  | { type: 'replyTicket'; data: ReplyTicketJobData }
  | { type: 'changeAssignee'; data: ChangeAssigneeJobData }
  | { type: 'delayNotify'; data: DelayNotifyJobData }
  | { type: 'ticketEvaluation'; data: TicketEvaluationJobData }
  | { type: 'changeStatus'; data: ChangeStatusJobData };

class Notification extends EventEmitter<EventHandler> {
  register(channel: Partial<EventHandler>) {
    Object.entries(channel).forEach(([e, h]) => this.on(e as any, h));
  }

  notifyNewTicket(data: NewTicketJobData) {
    queue.add({ type: 'newTicket', data });
  }

  notifyReplyTicket(data: ReplyTicketJobData) {
    queue.add({ type: 'replyTicket', data });
  }

  notifyChangeAssignee(data: ChangeAssigneeJobData) {
    queue.add({ type: 'changeAssignee', data });
  }

  notifyDelayNotify(data: DelayNotifyJobData) {
    queue.add({ type: 'delayNotify', data });
  }

  notifyTicketEvaluation(data: TicketEvaluationJobData) {
    queue.add({ type: 'ticketEvaluation', data });
  }

  notifyChangeStatus(data: ChangeStatusJobData) {
    queue.add({ type: 'changeStatus', data });
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
}

const notification = new Notification();

export default notification;

function ticketClosed(originalStatus: number, status: number): boolean {
  return originalStatus < 200 && status >= 200;
}

function ticketReopened(originalStatus: number, status: number): boolean {
  return originalStatus >= 200 && status < 200;
}

// 内置的通知逻辑
notification.register({
  newTicket: ({ ticket }) => {
    if (ticket.assigneeId) {
      NotificationModel.create({
        ACL: {
          [ticket.assigneeId]: { read: true, write: true },
        },
        latestAction: 'newTicket',
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
      NotificationModel.upsert(ticket.id, [to.id], 'changeAssignee').catch((error) => {
        // TODO: Sentry
        console.error(error);
      });
    }
  },
  ticketEvaluation: ({ ticket, to }) => {
    if (to) {
      NotificationModel.upsert(ticket.id, [to.id], 'ticketEvaluation').catch((error) => {
        // TODO: Sentry
        console.error(error);
      });
    }
  },
  changeStatus: ({ ticket, from, originalStatus, status }) => {
    const task = async () => {
      // 客服关闭或重新打开工单时增加 unreadCount
      if (ticketClosed(originalStatus, status) || ticketReopened(originalStatus, status)) {
        const isCustomerService = await ticket.isCustomerService(from);
        if (isCustomerService) {
          await ticket.increaseUnreadCount('changeStatus', from);
        }
      }
    };
    task().catch((error) => {
      // TODO: Sentry
      console.error('[ERROR] Increase unread count failed:', error);
    });
  },
});

const QUEUE_URL = process.env.REDIS_URL_QUEUE ?? 'redis://127.0.0.1:6379';
const queue = new Queue<JobData>('notification', QUEUE_URL, {
  limiter: {
    max: 100,
    duration: 5000,
  },
  defaultJobOptions: {
    removeOnComplete: true,
  },
});

queue.process((job) => {
  switch (job.data.type) {
    case 'newTicket':
      notification.processNewTicket(job.data.data);
      break;
    case 'replyTicket':
      notification.processReplyTicket(job.data.data);
      break;
    case 'changeAssignee':
      notification.processChangeAssignee(job.data.data);
      break;
    case 'delayNotify':
      notification.processDelayNotify(job.data.data);
      break;
    case 'ticketEvaluation':
      notification.processTicketEvaluation(job.data.data);
      break;
    case 'changeStatus':
      notification.processChangeStatus(job.data.data);
      break;
  }
});

events.on('ticket:created', ({ ticket }) => {
  notification.notifyNewTicket({
    ticketId: ticket.id,
    assigneeId: ticket.assigneeId,
  });
});

events.on('ticket:updated', ({ originalTicket, data, currentUserId }) => {
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
  notification.notifyReplyTicket({ replyId: reply.id });
});
