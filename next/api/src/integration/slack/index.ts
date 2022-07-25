import { WebClient } from '@slack/web-api';
import _ from 'lodash';

import notification, {
  ChangeAssigneeContext,
  ChangeStatusContext,
  DelayNotifyContext,
  InternalReplyContext,
  NewTicketContext,
  ReplyTicketContext,
  TicketEvaluationContext,
} from '@/notification';
import { Config } from '@/config';
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

interface SlackConfig {
  token: string;
  // broadcast channel
  channel?: string;
  categoryChannels: Record<string, string[]>;
}

class SlackIntegration {
  private client: WebClient;
  private userIdMap: Map<string, string> = new Map();
  private channelIdMap: Map<string, string> = new Map();

  private broadcastChannel?: string;
  private categoryChannels: Record<string, string[]>;

  constructor(config: SlackConfig) {
    this.client = new WebClient(config.token);
    this.broadcastChannel = config.channel;
    this.categoryChannels = _.mapValues(config.categoryChannels, (channels) => {
      return channels.filter((channel) => channel !== this.broadcastChannel);
    });

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

  send(channel: string, message: Message) {
    return this.client.chat.postMessage({ ...message.toJSON(), channel });
  }

  broadcast(message: Message, categoryId?: string) {
    if (this.broadcastChannel) {
      this.send(this.broadcastChannel, message);
    }
    if (categoryId) {
      this.sendToCategoryChannel(categoryId, message);
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

  sendToCategoryChannel(categoryId: string, message: Message) {
    const channels = this.categoryChannels[categoryId];
    channels?.forEach((channel) => this.send(channel, message));
  }

  sendNewTicket = ({ ticket, from, to }: NewTicketContext) => {
    const message = new NewTicketMessage(ticket, from, to);
    if (to?.email) {
      this.sendToUser(to.email, message);
    }
    this.broadcast(message, ticket.categoryId);
  };

  sendChangeAssignee = ({ ticket, from, to }: ChangeAssigneeContext) => {
    const message = new ChangeAssigneeMessage(ticket, from, to);
    if (to?.email) {
      this.sendToUser(to.email, message);
    }
    this.broadcast(message, ticket.categoryId);
  };

  sendReplyTicket = ({ ticket, reply, from, to }: ReplyTicketContext) => {
    if (reply.isCustomerService) {
      return;
    }
    const message = new ReplyTicketMessage(ticket, reply, from);
    if (to?.email) {
      this.sendToUser(to.email, message);
    }
    this.broadcast(message, ticket.categoryId);
  };

  sendInternalReply = ({ ticket, reply, from, to }: InternalReplyContext) => {
    const message = new InternalReplyMessage(ticket, reply, from);
    if (to && from.id !== to.id && to.email) {
      this.sendToUser(to.email, message);
    }
    this.broadcast(message, ticket.categoryId);
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
    this.broadcast(message, ticket.categoryId);
  };

  sendDelayNotify = ({ ticket, to }: DelayNotifyContext) => {
    const message = new DelayNotifyMessage(ticket, to);
    if (to?.email) {
      this.sendToUser(to.email, message);
    }
    this.broadcast(message, ticket.categoryId);
  };
}

async function getConfig() {
  const config: Partial<SlackConfig> = {
    token: process.env.SLACK_TOKEN,
    channel: process.env.SLACK_CHANNEL,
    categoryChannels: {},
  };

  const configObj = await Config.get('slack');
  Object.assign(config, configObj);

  if (config.token) {
    return config as SlackConfig;
  }
}

export default async function (install: Function) {
  const config = await getConfig();
  if (config) {
    new SlackIntegration(config);
    install('Slack', {});
  }
}
