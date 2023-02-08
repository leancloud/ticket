import crypto from 'crypto';
import { Context, Middleware } from 'koa';
import { Block, KnownBlock, LogLevel, WebClient } from '@slack/web-api';
import Router from '@koa/router';
import LRU from 'lru-cache';

import events from '@/events';
import notification from '@/notification';
import { Config } from '@/model/Config';
import { Ticket } from '@/model/Ticket';
import { User } from '@/model/User';
import { SlackNotification } from './SlackNotification';
import { message } from './message';

const EMPTY_ASSIGNEE_NAME = '<无>';

interface NotifyUpdateTicketOptions {
  assigneeUpdated?: boolean;
  jiraIssueCreated?: boolean;
}

class SlackIntegration {
  private client: WebClient;
  private userIdByEmail = new LRU<string, string>({ max: 500 });

  constructor(token: string, private channel: string) {
    this.client = new WebClient(token, { logLevel: LogLevel.ERROR });
  }

  private async getSlackDisplayName(email: string): Promise<string | undefined> {
    const cached = this.userIdByEmail.get(email);
    if (cached) {
      return cached;
    }
    try {
      const { user } = await this.client.users.lookupByEmail({ email });
      if (user) {
        const name = `<@${user.id}>`;
        this.userIdByEmail.set(email, name);
        return name;
      }
    } catch (error: any) {
      if (error.data?.error !== 'users_not_found') {
        throw error;
      }
    }
  }

  private async getAssigneeDisplayName(assigneeId: string): Promise<string> {
    const assignee = await User.find(assigneeId, { useMasterKey: true });
    if (!assignee) {
      return EMPTY_ASSIGNEE_NAME;
    }
    if (!assignee.email) {
      return assignee.getDisplayName();
    }
    return (await this.getSlackDisplayName(assignee.email)) ?? assignee.getDisplayName();
  }

  private createNotificationObject(ts: string, ticket: Ticket, assigneeName: string) {
    return SlackNotification.create(
      {
        ACL: {},
        channel: this.channel,
        ts,
        ticket: {
          objectId: ticket.id,
        },
        assignee: {
          objectId: ticket.assigneeId ?? '',
          displayName: assigneeName,
        },
      },
      { useMasterKey: true }
    );
  }

  private getNotificationObject(ticketId: string) {
    return SlackNotification.queryBuilder()
      .where('ticket.objectId', '==', ticketId)
      .first({ useMasterKey: true });
  }

  async postMessage(message: (KnownBlock | Block)[], thread_ts?: string, channel?: string) {
    const { ts } = await this.client.chat.postMessage({
      channel: channel ?? this.channel,
      blocks: message,
      thread_ts,
    });

    return ts;
  }

  async notifyNewTicket(ticket: Ticket) {
    const assigneeName = ticket.assigneeId
      ? await this.getAssigneeDisplayName(ticket.assigneeId)
      : EMPTY_ASSIGNEE_NAME;

    const { ts } = await this.client.chat.postMessage({
      channel: this.channel,
      ...message(ticket, assigneeName, false),
    });

    await this.createNotificationObject(ts!, ticket, assigneeName);
  }

  async notifyUpdateTicket(ticket: Ticket, options?: NotifyUpdateTicketOptions) {
    const notification = await this.getNotificationObject(ticket.id);
    if (!notification) {
      return;
    }

    let assigneeName = notification.assignee.displayName;

    if (options?.assigneeUpdated) {
      assigneeName = ticket.assigneeId
        ? await this.getAssigneeDisplayName(ticket.assigneeId)
        : EMPTY_ASSIGNEE_NAME;

      await notification.update(
        {
          assignee: {
            objectId: ticket.assigneeId ?? '',
            displayName: assigneeName,
          },
        },
        { useMasterKey: true }
      );
    }

    await this.client.chat.update({
      channel: notification.channel,
      ts: notification.ts,
      ...message(ticket, assigneeName, options?.jiraIssueCreated),
    });
  }

  private async getUserEmail(slackUserId: string): Promise<string | undefined> {
    const { profile } = await this.client.users.profile.get({ user: slackUserId });
    return profile?.email;
  }

  private async handleCloseTicket(slackUserId: string, ticketId: string) {
    const email = await this.getUserEmail(slackUserId);
    if (!email) {
      return;
    }

    const user = await User.queryBuilder()
      .where('email', '==', email)
      .first({ useMasterKey: true });
    if (!user) {
      return;
    }
    if (!(await user.isCustomerService())) {
      return;
    }

    const ticket = await Ticket.find(ticketId, { useMasterKey: true });
    if (!ticket) {
      return;
    }

    // XXX: 这里必须使用 masterKey，因为查询获取的 user 没有 sessionToken
    await ticket.operate('close', user, { useMasterKey: true });
  }

  async handleInteractive({ user, actions }: any) {
    if (actions?.length) {
      if (actions[0].text.text === '关闭工单') {
        await this.handleCloseTicket(user.id, actions[0].value);
      }
    }
  }
}

interface SlackPlusConfig {
  token: string;
  channel: string;
  signingSecret: string;
  disabled?: boolean;
}

async function getConfig(): Promise<SlackPlusConfig | undefined> {
  const config = await Config.get('slack-plus');
  if (!config) {
    return;
  }
  const requiredKeys: (keyof SlackPlusConfig)[] = ['token', 'channel', 'signingSecret'];
  const missingKeys = requiredKeys.filter((key) => config[key] === undefined);
  if (missingKeys.length) {
    console.warn('[SlackPlus] Missing config:', missingKeys.join(', '));
    return;
  }
  return config as SlackPlusConfig;
}

function isFresh(unixTime: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(unixTime - now) < 60 * 5;
}

function validateInteractiveRequest(signingSecret: string): Middleware {
  return (ctx: Context, next) => {
    const signature = ctx.get('X-Slack-Signature');
    ctx.assert(signature !== '', 400);

    const timestamp = ctx.get('X-Slack-Request-Timestamp');
    ctx.assert(timestamp !== '', 400);
    ctx.assert(/^\d+$/.test(timestamp), 400);
    ctx.assert(isFresh(parseInt(timestamp)), 403);

    const body = ctx.request.rawBody;
    const sigBase = `v0:${timestamp}:${body}`;
    const sigToCompare = crypto.createHmac('sha256', signingSecret).update(sigBase).digest('hex');
    // 一会冒号一会等号，Slack 不一致的地方也太多了 😑
    ctx.assert(signature === `v0=${sigToCompare}`, 403);

    return next();
  };
}

export class CreateSlackPlus {
  private static slackInstance: SlackIntegration | undefined;
  private static initializationFailed = false;

  static async get<T extends SlackPlusConfig | undefined>(
    config?: T
  ): Promise<T extends undefined ? SlackIntegration | undefined : SlackIntegration> {
    if (this.slackInstance) return this.slackInstance;

    if (this.initializationFailed)
      return undefined as T extends undefined ? SlackIntegration | undefined : SlackIntegration;

    const _config = config ?? (await getConfig());

    return _config
      ? (this.slackInstance = new SlackIntegration(_config.token, _config.channel))
      : (((this.initializationFailed = true), undefined) as T extends undefined
          ? SlackIntegration | undefined
          : SlackIntegration);
  }
}

export default async function (install: Function) {
  const config = await getConfig();
  if (!config || config.disabled) {
    return;
  }

  const slack = await CreateSlackPlus.get(config);

  const catchFunc = (error: Error) => {
    // TODO: Sentry
    console.error('[SlackPlus] Failed to notify,', error);
  };

  notification.register({
    newTicket: ({ ticket }) => {
      slack.notifyNewTicket(ticket).catch(catchFunc);
    },
    changeAssignee: ({ ticket }) => {
      slack.notifyUpdateTicket(ticket, { assigneeUpdated: true }).catch(catchFunc);
    },
    changeStatus: ({ ticket, originalStatus, status }) => {
      if (originalStatus !== status) {
        slack.notifyUpdateTicket(ticket).catch(catchFunc);
      }
    },
    replyTicket: ({ ticket }) => {
      slack.notifyUpdateTicket(ticket).catch(catchFunc);
    },
  });

  events.on('jira/issue:created', ({ ticket }) => {
    slack.notifyUpdateTicket(ticket, { jiraIssueCreated: true }).catch(catchFunc);
  });

  const router = new Router({ prefix: '/integrations/slack-plus' });

  router.post('/interactive-endpoint', validateInteractiveRequest(config.signingSecret), (ctx) => {
    const payload = JSON.parse(ctx.request.body.payload);
    slack.handleInteractive(payload).catch((error) => {
      // TODO: Sentry
      console.error('[SlackPlus] Failed to handle interactive message,', error);
    });
    ctx.status = 200;
  });

  install('SlackPlus', { router });
}
