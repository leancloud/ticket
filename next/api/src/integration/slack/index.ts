import { WebClient } from '@slack/web-api';

import notification, {
  ChangeAssigneeContext,
  ChangeStatusContext,
  DelayNotifyContext,
  InternalReplyContext,
  NewTicketContext,
  ReplyTicketContext,
  TicketEvaluationContext,
} from '@/notification';
import { Ticket } from '@/model/Ticket';
import {
  Message,
  NewTicketMessage,
  ChangeAssigneeMessage,
  ReplyTicketMessage,
  InternalReplyMessage,
  ResolveTicketMessage,
  CloseTicketMessage,
  EvaluateTicketMessage,
  DelayNotifyMessage,
} from './message';

class SlackIntegration {
  private client: WebClient;
  private userIdMap: Map<string, string> = new Map();
  private channelIdMap: Map<string, string> = new Map();

  constructor(token: string, readonly broadcastChannelId?: string) {
    this.client = new WebClient(token);
    notification.on('newTicket', this.sendNewTicket);
    notification.on('changeAssignee', this.sendChangeAssignee);
    notification.on('replyTicket', this.sendReplyTicket);
    notification.on('internalReply', this.sendInternalReply);
    notification.on('changeStatus', this.sendChangeStatus);
    notification.on('ticketEvaluation', this.sendEvaluation);
    notification.on('delayNotify', this.sendDelayNotify);
  }

  async getUserId(email: string): Promise<string> {
    const id = this.userIdMap.get(email);
    if (id) {
      return id;
    }

    const { user } = await this.client.users.lookupByEmail({ email });
    if (!user || !user.id) {
      throw new Error('Slack API returns an invalid user');
    }
    this.userIdMap.set(email, user.id);
    return user.id;
  }

  async getChannelId(userId: string): Promise<string> {
    const channelId = this.channelIdMap.get(userId);
    if (channelId) {
      return channelId;
    }

    const { channel } = await this.client.conversations.open({ users: userId });
    if (!channel || !channel.id) {
      throw new Error('Slack API returns an invalid channel');
    }
    this.channelIdMap.set(userId, channel.id);
    return channel.id;
  }

  send(channel: string, message: Message, detailed = true) {
    return this.client.chat.postMessage({ ...message.toJSON(detailed), channel });
  }

  broadcast(message: Message) {
    if (this.broadcastChannelId) {
      return this.send(this.broadcastChannelId, message, false);
    }
  }

  async sendToUser(email: string, message: Message) {
    let userId: string;
    try {
      userId = await this.getUserId(email);
    } catch (error: any) {
      if (error.data.error === 'users_not_found') {
        return;
      }
      throw error;
    }

    const channelId = await this.getChannelId(userId);
    return this.send(channelId, message);
  }

  sendNewTicket = ({ ticket, from, to }: NewTicketContext) => {
    const message = new NewTicketMessage(ticket, from, to);
    if (to?.email) {
      this.sendToUser(to.email, message);
    }
    this.broadcast(message);
  };

  sendChangeAssignee = ({ ticket, from, to }: ChangeAssigneeContext) => {
    const message = new ChangeAssigneeMessage(ticket, from, to);
    if (to?.email) {
      this.sendToUser(to.email, message);
    }
    this.broadcast(message);
  };

  sendReplyTicket = ({ ticket, reply, from, to }: ReplyTicketContext) => {
    if (reply.isCustomerService) {
      return;
    }
    const message = new ReplyTicketMessage(ticket, reply, from);
    if (to?.email) {
      this.sendToUser(to.email, message);
    }
    this.broadcast(message);
  };

  sendInternalReply = ({ ticket, reply, from, to }: InternalReplyContext) => {
    const message = new InternalReplyMessage(ticket, reply, from);
    if (to && from.id !== to.id && to.email) {
      this.sendToUser(to.email, message);
    }
    this.broadcast(message);
  };

  sendChangeStatus = ({ ticket, from, to, status }: ChangeStatusContext) => {
    if (!to || !to.email) {
      return;
    }

    if (status === Ticket.Status.CLOSED) {
      const message = new CloseTicketMessage(ticket, from);
      this.sendToUser(to.email, message);
      return;
    }

    if (status === Ticket.Status.FULFILLED) {
      const message = new ResolveTicketMessage(ticket, from);
      this.sendToUser(to.email, message);
      return;
    }
  };

  sendEvaluation = ({ ticket, from, to }: TicketEvaluationContext) => {
    const message = new EvaluateTicketMessage(ticket, from);
    if (to?.email) {
      this.sendToUser(to.email, message);
    }
    this.broadcast(message);
  };

  sendDelayNotify = ({ ticket, to }: DelayNotifyContext) => {
    const message = new DelayNotifyMessage(ticket, to);
    if (to?.email) {
      this.sendToUser(to.email, message);
    }
    this.broadcast(message);
  };
}

export default function (install: Function) {
  const token = process.env.SLACK_TOKEN;
  const channel = process.env.SLACK_CHANNEL; // broadcast target
  if (!token) {
    return;
  }

  new SlackIntegration(token, channel);

  install('Slack', {});
}
