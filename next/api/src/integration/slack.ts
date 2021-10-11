import { WebClient } from '@slack/web-api';

import notification, {
  ChangeStatusContext,
  DelayNotifyContext,
  NewTicketContext,
  ReplyTicketContext,
  TicketEvaluationContext,
} from '@/notification';
import type { Reply } from '@/model/Reply';
import type { Ticket } from '@/model/Ticket';
import type { User } from '@/model/User';

const token = process.env.SLACK_TOKEN;
const channel = process.env.SLACK_CHANNEL; // broadcast target

class Message {
  constructor(readonly summary: string, readonly content: string) {}

  toJSON() {
    return {
      text: this.summary,
      attachments: [
        {
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: this.content,
              },
            },
          ],
        },
      ],
    };
  }
}

function getTicketLink(ticket: Ticket): string {
  return `<${ticket.getUrl()}|#${ticket.nid}>`;
}

class NewTicketMessage extends Message {
  constructor(ticket: Ticket, author: User, assignee?: User) {
    let summary = `:envelope: ${author.getDisplayName()} 提交工单 ${getTicketLink(ticket)}`;
    if (assignee) {
      summary += ` 给 ${assignee.getDisplayName()}`;
    }
    super(summary, ticket.title + '\n\n' + ticket.content);
  }
}

class ChangeAssigneeMessage extends Message {
  constructor(ticket: Ticket, operator: User, assignee?: User) {
    const assigneeName = assignee ? assignee.getDisplayName() : '<未分配>';
    const summary = `:arrows_counterclockwise: ${operator.getDisplayName()} 转移工单 ${getTicketLink(
      ticket
    )} 给 ${assigneeName}`;
    let content = ticket.title;
    if (ticket.latestReply) {
      content += '\n\n' + ticket.latestReply.content;
    }
    super(summary, content);
  }
}

class ReplyTicketMessage extends Message {
  constructor(ticket: Ticket, reply: Reply, author: User) {
    super(
      `:speech_balloon: ${author.getDisplayName()} 回复工单 ${getTicketLink(ticket)}`,
      ticket.title + '\n\n' + reply.content
    );
  }
}

class EvaluateTicketMessage extends Message {
  constructor(ticket: Ticket, operator: User) {
    const { star, content } = ticket.evaluation!;
    const emoji = star ? ':thumbsup:' : ':thumbsdown:';
    super(
      `${emoji} ${operator.getDisplayName()} 评价工单 ${getTicketLink(ticket)}`,
      ticket.title + '\n\n' + content
    );
  }
}

class DelayNotifyMessage extends Message {
  constructor(ticket: Ticket, assignee?: User) {
    const assigneeName = assignee ? assignee.getDisplayName() : '<未分配>';
    let content = ticket.title;
    if (ticket.latestReply) {
      content += '\n\n' + ticket.latestReply.content;
    }
    super(`:alarm_clock: 提醒 ${assigneeName} 回复工单 ${getTicketLink(ticket)}`, content);
  }
}

class SlackIntegration {
  private client: WebClient;
  private userIdMap: Map<string, string> = new Map();
  private channelIdMap: Map<string, string> = new Map();

  constructor(token: string, readonly broadcastChannelId?: string) {
    this.client = new WebClient(token);
    notification.on('newTicket', this.sendNewTicket);
    notification.on('changeAssignee', this.sendChangeAssignee);
    notification.on('replyTicket', this.sendReplyTicket);
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

  broadcast(message: Message) {
    if (this.broadcastChannelId) {
      return this.send(this.broadcastChannelId, message);
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

  sendChangeAssignee = ({ ticket, from, to }: ChangeStatusContext) => {
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

export const enabled = !!token;

if (token) {
  new SlackIntegration(token, channel);
  console.log('[Slack] Enabled');
}
