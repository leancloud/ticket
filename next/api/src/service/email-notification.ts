import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';

import notification from '@/notification';
import { HttpError } from '@/common/http';
import { Config } from '@/config';
import {
  EmailNotification,
  SetEmailNotificationData,
  SmtpConfig,
} from '@/interfaces/email-notification';
import { Reply } from '@/model/Reply';
import { Ticket } from '@/model/Ticket';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

export class EmailNotificationService {
  private createClient(smtp: SmtpConfig) {
    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
    });
  }

  async set(data: SetEmailNotificationData) {
    const config = await Config.get<EmailNotification>('emailNotification', { cache: false });
    const password = data.send.smtp.password ?? config?.send.smtp.password;
    if (!password) {
      throw new HttpError(400, 'Missing SMTP password');
    }
    const newConfig: EmailNotification = {
      send: {
        smtp: {
          ...data.send.smtp,
          password,
        },
      },
      events: data.events,
    };
    const client = this.createClient(newConfig.send.smtp);
    try {
      if (!(await client.verify())) {
        throw new HttpError(400, 'Invalid SMTP config');
      }
      await Config.set('emailNotification', newConfig);
    } finally {
      client.close();
    }
  }

  get(cache = true) {
    return Config.get<EmailNotification>('emailNotification', { cache });
  }

  remove() {
    return Config.remove('emailNotification');
  }

  async onCustomerServiceReply(ticket: Ticket, reply: Reply) {
    const config = await this.get();
    if (!config) {
      return;
    }

    const events = config.events.filter((e) => e.type === 'ticketRepliedByCustomerService');
    if (events.length === 0) {
      return;
    }

    // Prepare ticket author for template
    await ticket.load('author');

    const tmplCtx = { ticket, reply };
    const render = (tmplString: string) => {
      const template = Handlebars.compile(tmplString);
      return template(tmplCtx);
    };

    const client = this.createClient(config.send.smtp);
    try {
      for (const event of events) {
        const to = render(event.to);
        if (!isEmail(to)) {
          continue;
        }

        if (ticket.channel === 'email' && to === ticket.author?.email) {
          // 邮件渠道创建的工单，避免重复回复用户
          continue;
        }

        await client.sendMail({
          from: event.from ?? config.send.smtp.username,
          to,
          subject: render(event.subject),
          text: event.message.text && render(event.message.text),
          html: event.message.html && render(event.message.html),
        });
      }
    } finally {
      client.close();
    }
  }
}

export const emailNotificationService = new EmailNotificationService();

notification.on('replyTicket', (ctx) => {
  if (ctx.reply.internal) {
    return;
  }
  if (ctx.reply.isCustomerService) {
    emailNotificationService.onCustomerServiceReply(ctx.ticket, ctx.reply);
  }
});
