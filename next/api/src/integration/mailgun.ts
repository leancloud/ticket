import crypto from 'crypto';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import Koa from 'koa';
import Router from '@koa/router';

import notification, {
  ChangeAssigneeContext,
  DelayNotifyContext,
  NewTicketContext,
  ReplyTicketContext,
} from '../notification';
import { Ticket } from '../model/Ticket';
import { User } from '../model/User';

const mailgun = new Mailgun(formData);
const payloadStringKeys = ['Subject', 'To', 'stripped-text', 'timestamp', 'token', 'signature'];

const key = process.env.MAILGUN_KEY;
const domain = process.env.MAILGUN_DOMAIN;

interface SendOptions {
  from: string;
  to: string;
  subject: string;
  replyTo?: string;
  text: string;
  ticketUrl: string;
}

class MailgunClient {
  private client: ReturnType<Mailgun['client']>;

  constructor(private key: string, private domain: string) {
    this.client = mailgun.client({ username: 'api', key });
    notification.on('newTicket', this.sendNewTicket);
    notification.on('replyTicket', this.sendReplyTicket);
    notification.on('changeAssignee', this.sendChangeAssignee);
    notification.on('delayNotify', this.sendDelayNotify);
  }

  verifyWebhook = (ctx: Koa.Context, next: Koa.Next) => {
    const { body } = ctx.request;
    for (const key of payloadStringKeys) {
      if (typeof body[key] !== 'string') {
        ctx.throw(406);
      }
    }
    const encodedToken = crypto
      .createHmac('sha256', this.key)
      .update(body.timestamp + body.token)
      .digest('hex');
    if (encodedToken !== body.signature) {
      ctx.throw(406);
    }
    return next();
  };

  send(options: SendOptions) {
    this.client.messages
      .create(this.domain, {
        from: options.from,
        to: options.to,
        subject: options.subject,
        'h:Reply-To': options.replyTo,
        text: `${options.text}

--
您能收到邮件是因为该工单与您相关。
可以直接回复邮件，或者点击 ${options.ticketUrl} 查看。`,
      })
      .catch(console.error); // TODO: Sentry
  }

  sendNewTicket = ({ ticket, from, to }: NewTicketContext) => {
    if (!to?.email) {
      return;
    }
    this.send({
      from: `${from.getDisplayName()} <ticket@leancloud.cn>`,
      to: to.email,
      subject: `[LeanTicket] ${ticket.title} (#${ticket.nid})`,
      replyTo: `ticket-${to.id}@leancloud.cn`,
      text: ticket.content,
      ticketUrl: ticket.getUrl(),
    });
  };

  sendReplyTicket = ({ ticket, reply, from, to }: ReplyTicketContext) => {
    if (!to?.email) {
      return;
    }
    this.send({
      from: `${from.getDisplayName()} <ticket@leancloud.cn>`,
      to: to.email,
      subject: `[LeanTicket] ${ticket.title} (#${ticket.nid})`,
      replyTo: `ticket-${to.id}@leancloud.cn`,
      text: reply.content,
      ticketUrl: ticket.getUrl(),
    });
  };

  sendChangeAssignee = ({ ticket, from, to }: ChangeAssigneeContext) => {
    if (!to?.email) {
      return;
    }
    this.send({
      from: `${from.getDisplayName()} <ticket@leancloud.cn>`,
      to: to.email,
      subject: `[LeanTicket] ${ticket.title} (#${ticket.nid})`,
      replyTo: `ticket-${to.id}@leancloud.cn`,
      text: `${from.getDisplayName()} 将该工单转交给您处理。
该工单的问题：

${ticket.content}

该工单最后一条回复：

${ticket.latestReply?.content || '<暂无>'}`,
      ticketUrl: ticket.getUrl(),
    });
  };

  sendDelayNotify = ({ ticket, from, to }: DelayNotifyContext) => {
    if (!to?.email) {
      return;
    }
    this.send({
      from: `${from.getDisplayName()} <ticket@leancloud.cn>`,
      to: to.email,
      subject: `亲爱的 ${to.getDisplayName()}，快去回工单，比心👬👬👬`,
      text: `该工单的问题：

${ticket.content}

该工单最后一条回复：

${ticket.latestReply?.content || '<暂无>'}`,
      ticketUrl: ticket.getUrl(),
    });
  };
}

function getTicketNid(subject: string): string | undefined {
  const match = subject.match(/.*\s\(#(\d+)\)$/);
  if (match) {
    return match[1];
  }
}

function getUserId(to: string): string | undefined {
  const match = to.match(/^.*<?ticket-(.*)@leancloud.cn>?.*$/);
  if (match) {
    return match[1];
  }
}

export const router = new Router();

export const enabled = key && domain;

if (enabled) {
  const mailgunClient = new MailgunClient(key!, domain!);

  router.post('/webhooks/mailgun/catchall', mailgunClient.verifyWebhook, async (ctx) => {
    const { Subject, To } = ctx.request.body;
    const ticketNid = getTicketNid(Subject);
    const userId = getUserId(To);
    if (!ticketNid || !userId) {
      return ctx.throw(406);
    }

    const user = await User.findWithSessionToken(userId);
    if (!user) {
      return ctx.throw(406);
    }
    const ticket = await Ticket.queryBuilder().where('nid', '==', parseInt(ticketNid)).first(user);
    if (!ticket) {
      return ctx.throw(406);
    }

    await ticket.reply({
      author: user,
      content: ctx.request.body['stripped-text'].replace(/\r\n/g, '\n'),
    });

    ctx.status = 200;
  });

  console.log('[Maingun] Enabled');
}
