import { WebClient } from '@slack/web-api';
import LRUCache from 'lru-cache';
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
import { categoryService } from '@/category';
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
  events: string[];
}

class SlackIntegration {
  private client: WebClient;
  private userIdMap: Map<string, string> = new Map();
  private channelIdMap: Map<string, string> = new Map();

  private broadcastChannel?: string;
  private categoryChannels: Record<string, string[]>;

  private channelMembers: LRUCache<string, string[]>;

  constructor(config: SlackConfig) {
    this.client = new WebClient(config.token);
    this.broadcastChannel = config.channel;
    this.categoryChannels = _.mapValues(config.categoryChannels, (channels) => {
      return channels.filter((channel) => channel !== this.broadcastChannel);
    });

    this.channelMembers = new LRUCache({
      max: 100,
      ttl: 1000 * 60 * 60, // 1 hour
    });

    config.events.forEach((event) => {
      switch (event) {
        case 'newTicket':
          notification.on('newTicket', this.sendNewTicket);
          break;
        case 'changeAssignee':
          notification.on('changeAssignee', this.sendChangeAssignee);
          break;
        case 'replyTicket':
          notification.on('replyTicket', this.sendReplyTicket);
          break;
        case 'internalReply':
          notification.on('internalReply', this.sendInternalReply);
          break;
        case 'changeStatus':
          notification.on('changeStatus', this.sendChangeStatus);
          break;
        case 'ticketEvaluation':
          notification.on('ticketEvaluation', this.sendEvaluation);
          break;
        case 'delayNotify':
          notification.on('delayNotify', this.sendDelayNotify);
          break;
      }
    });
  }

  async getUserId(email: string) {
    const id = this.userIdMap.get(email);
    if (id) {
      return id;
    }

    try {
      const { user } = await this.client.users.lookupByEmail({ email });
      if (!user || !user.id) {
        throw new Error('Slack API returns an invalid user');
      }
      this.userIdMap.set(email, user.id);
      return user.id;
    } catch (error: any) {
      if (error.data.error !== 'users_not_found') {
        throw error;
      }
    }
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

  async getChannelMembers(channelId: string) {
    const cacheValue = this.channelMembers.get(channelId);
    if (cacheValue) {
      return cacheValue;
    }

    const members: string[] = [];
    let cursor: string | undefined;
    // take 10 times at most
    for (let c = 0; c <= 10; c += 1) {
      const res = await this.client.conversations.members({
        channel: channelId,
        limit: 200,
        cursor,
      });
      res.members?.forEach((member) => members.push(member));
      if (!res.response_metadata?.next_cursor) {
        break;
      }
      cursor = res.response_metadata.next_cursor;
    }

    this.channelMembers.set(channelId, members);
    return members;
  }

  async inviteToChannel(channelId: string, userIds: string[]) {
    try {
      const members = await this.getChannelMembers(channelId);
      const inviteUsers = _.difference(userIds, members);
      if (inviteUsers.length) {
        await this.client.conversations.invite({
          users: inviteUsers.join(','),
          channel: channelId,
        });
        this.channelMembers.delete(channelId);
      }
    } catch {} // ignore
  }

  send(channel: string, message: Message) {
    return this.client.chat.postMessage({ ...message.toJSON(), channel });
  }

  async broadcast(message: Message, categoryId?: string) {
    if (this.broadcastChannel) {
      if (message.mentions) {
        await this.inviteToChannel(this.broadcastChannel, message.mentions);
      }
      await this.send(this.broadcastChannel, message);
    }
    if (categoryId) {
      await this.sendToCategoryChannel(categoryId, message);
    }
  }

  async sendToUser(email: string, message: Message) {
    const userId = await this.getUserId(email);
    if (!userId) {
      return;
    }
    const channelId = await this.getChannelId(userId);
    return this.send(channelId, message);
  }

  async sendToCategoryChannel(categoryId: string, message: Message) {
    const parents = await categoryService.getParentCategories(categoryId);
    const categoryIds = [...parents.map((c) => c.id), categoryId];
    const sended = new Set<string>();
    for (const cid of categoryIds) {
      const channels = this.categoryChannels[cid];
      if (!channels) continue;
      for (const channel of channels) {
        if (sended.has(channel)) continue;
        if (message.mentions) {
          await this.inviteToChannel(channel, message.mentions);
        }
        await this.send(channel, message);
        sended.add(channel);
      }
    }
  }

  async getCategoryMentionUserIds(categoryId: string) {
    const category = await categoryService.findOne(categoryId);
    if (!category || !category.meta) {
      return;
    }

    const emails = category.meta.slackNewTicketMentionUserEmails as string[];
    if (!emails) {
      return;
    }

    const userIds: string[] = [];
    for (const email of emails) {
      const id = await this.getUserId(email);
      if (id) {
        userIds.push(id);
      }
    }
    return userIds;
  }

  sendNewTicket = async ({ ticket, from, to }: NewTicketContext) => {
    const message = new NewTicketMessage(ticket, from, to);
    if (to?.email) {
      this.sendToUser(to.email, message);
    }
    const userIds = await this.getCategoryMentionUserIds(ticket.categoryId);
    if (userIds?.length) {
      message.setMentions(userIds);
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
    events: [
      'newTicket',
      'changeAssignee',
      'replyTicket',
      'internalReply',
      'changeStatus',
      'ticketEvaluation',
      'delayNotify',
    ],
  };

  const configObj = await Config.get('slack');
  Object.assign(config, configObj);

  if (config.token) {
    return config as SlackConfig;
  }
}

export class CreateSlack {
  private static slackInstance: SlackIntegration | undefined;
  private static installFailed = false;

  static async get(config?: SlackConfig) {
    if (this.slackInstance) {
      return this.slackInstance;
    }

    if (this.installFailed) {
      return undefined;
    }

    const _config = config ?? (await getConfig());

    return _config
      ? (this.slackInstance = new SlackIntegration(_config))
      : ((this.installFailed = true), undefined);
  }
}

export default async function (install: Function) {
  const slack = await CreateSlack.get();
  if (slack) {
    install('Slack', {});
  }
}
