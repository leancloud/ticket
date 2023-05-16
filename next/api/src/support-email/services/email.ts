import _ from 'lodash';
import AV from 'leancloud-storage';
import axios from 'axios';
import { Job, Queue } from 'bull';
import { FetchMessageObject, ImapFlow, MailboxObject } from 'imapflow';
import { ParsedMail, simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';
import { convert as html2text } from 'html-to-text';
import Mustache from 'mustache';
import throat from 'throat';

import { Ticket } from '@/model/Ticket';
import { createQueue } from '@/queue';
import { fileService } from '@/file/services/file';
import { ticketService } from '@/ticket/services/ticket';
import { userService } from '@/user/services/user';
import { SupportEmail } from '../entities/SupportEmail';
import { JobData, ProcessMessageJobData } from '../types';
import { supportEmailService } from './support-email';
import { supportEmailMessageService } from './support-email-message';

export class EmailService {
  private queue: Queue<JobData>;

  constructor() {
    this.queue = createQueue('support_email', {
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
    this.queue.process((job) => this.processJob(job));
    this.queue.on('failed', (job, error) => {
      console.error('[EmailService] job failed', job.data, error);
    });
  }

  async checkNewMessages() {
    const supportAddresses = await supportEmailService.getSupportEmails();
    const maxCount = 100;
    const run = async (supportEmail: SupportEmail) => {
      try {
        const count = await this.dispatchCreateEmailTicketJob(supportEmail, maxCount);
        return { email: supportEmail.email, success: true, count };
      } catch (e) {
        console.log('[Support Email] check new messages', supportEmail.email, e);
        const message = (e as Error).message;
        return { email: supportEmail.email, success: false, message };
      }
    };
    return Promise.all(supportAddresses.map(throat(2, run)));
  }

  async dispatchCreateEmailTicketJob(supportEmail: SupportEmail, count: number) {
    const client = this.createImapClient(supportEmail);
    await client.connect();

    const nextUid =
      supportEmail.lastUid === undefined ? await this.getUidNext(client) : supportEmail.lastUid + 1;
    const range = `${nextUid ?? 0}:*`;

    let uids = await this.getMessageUids(client, range);

    await client.logout();

    if (uids.length) {
      uids = uids.slice(0, count);
      await this.createProcessMessageJobs(supportEmail.email, uids);
      await supportEmailService.updateLastUid(supportEmail, uids[uids.length - 1]);
    }

    return uids.length;
  }

  createImapClient(supportEmail: Pick<SupportEmail, 'imap' | 'auth'>) {
    return new ImapFlow({
      host: supportEmail.imap.host,
      port: supportEmail.imap.port,
      secure: supportEmail.imap.secure,
      auth: {
        user: supportEmail.auth.username,
        pass: supportEmail.auth.password,
      },
      logger: false,
    });
  }

  async getUidNext(client: ImapFlow) {
    const lock = await client.getMailboxLock('INBOX');
    try {
      return (client.mailbox as MailboxObject).uidNext;
    } finally {
      lock.release();
    }
  }

  async getMessageUids(client: ImapFlow, range: string) {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const generator = client.fetch(
        range,
        {},
        {
          uid: true,
        } as any // changedSince is not mandatory
      );
      const messages = await this.getMessagesFromGenerator(generator);
      return messages.map((msg) => msg.uid);
    } finally {
      lock.release();
    }
  }

  async createProcessMessageJobs(email: string, uids: number[]) {
    const jobDatas = uids.map<{ data: JobData }>((uid) => {
      return {
        data: {
          type: 'processMessage',
          supportEmail: email,
          messageUid: uid,
        },
      };
    });
    await this.queue.addBulk(jobDatas);
  }

  async getMessagesFromGenerator(generator: AsyncGenerator<FetchMessageObject, never, void>) {
    const messages: FetchMessageObject[] = [];
    for await (const message of generator) {
      messages.push(message);
    }
    return messages;
  }

  async processJob(job: Job<JobData>) {
    switch (job.data.type) {
      case 'processMessage':
        await this.processMessage(job.data);
      default:
        console.warn(`[Support Email] unknown job type "${job.data.type}"`);
    }
  }

  async processMessage(data: ProcessMessageJobData) {
    const supportEmail = await supportEmailService.getSupportEmailByEmail(data.supportEmail);
    if (!supportEmail) {
      return;
    }

    const client = this.createImapClient(supportEmail);
    await client.connect();
    const source = await this.getMessageSource(client, data.messageUid);
    await client.logout();

    const message = await simpleParser(source, {
      // 内嵌图片会转换成 base64 字符串，但现在只显示纯文本，所以关闭此选项以节约存储空间
      skipImageLinks: true,
    });
    if (message.inReplyTo) {
      await this.createReplyByMessage(message, data);
    } else {
      await this.createTicketByMessage(message, data, supportEmail);
    }
  }

  async getMessageSource(client: ImapFlow, uid: number) {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const message = await client.fetchOne(uid.toString(), { source: true }, { uid: true });
      return message.source;
    } finally {
      lock.release();
    }
  }

  async createTicketByMessage(
    message: ParsedMail,
    jobData: ProcessMessageJobData,
    supportEmail: SupportEmail
  ) {
    const from = this.getMessageFrom(message);
    if (!from || !message.messageId) {
      return;
    }

    const author = await userService.getOrCreateUserByEmailAndName(from.email, from.name);
    const attachments = await this.uploadAttachments(message);
    const ticket = await ticketService.createTicketFromEmail(
      author,
      supportEmail.categoryId,
      message.subject,
      this.getPlainTextFromMessage(message),
      attachments.map((a) => a.objectId)
    );
    await supportEmailMessageService.create({
      from: from.email,
      to: jobData.supportEmail,
      messageId: message.messageId,
      inReplyTo: message.inReplyTo,
      references: message.references ? _.castArray(message.references) : undefined,
      subject: message.subject,
      html: message.html || undefined,
      date: message.date,
      attachments,
      ticketId: ticket.id,
    });

    if (supportEmail.receipt.enabled) {
      await this.sendReceipt(from.email, message.messageId, supportEmail, ticket);
    }
  }

  async createReplyByMessage(message: ParsedMail, jobData: ProcessMessageJobData) {
    const from = this.getMessageFrom(message);
    if (!from || !message.messageId) {
      return;
    }

    const ticketMessageId = this.getTicketMessageId(message);
    if (!ticketMessageId) {
      return;
    }

    const supportEmailMessage = await supportEmailMessageService.getByMessageId(ticketMessageId);
    if (!supportEmailMessage) {
      // TODO: 可能回复的邮件还没处理完成，添加重试逻辑
      return;
    }

    const ticket = await Ticket.find(supportEmailMessage.ticketId, { useMasterKey: true });
    if (!ticket) {
      return;
    }

    const author = await userService.getUserByEmail(from.email);
    if (!author || author.id !== ticket.authorId) {
      return;
    }

    const attachments = await this.uploadAttachments(message);
    const reply = await ticket.reply({
      author,
      content: this.getPlainTextFromMessage(message),
      fileIds: attachments.map((a) => a.objectId),
    });
    await supportEmailMessageService.create({
      from: from.email,
      to: jobData.supportEmail,
      messageId: message.messageId,
      inReplyTo: message.inReplyTo,
      references: message.references ? _.castArray(message.references) : undefined,
      subject: message.subject,
      html: message.html || undefined,
      date: message.date,
      attachments,
      ticketId: ticket.id,
      replyId: reply.id,
    });
  }

  getTicketMessageId(message: ParsedMail) {
    if (message.references) {
      if (typeof message.references === 'string') {
        return message.references;
      }
      return message.references[0];
    }
    return message.inReplyTo;
  }

  getMessageFrom(message: ParsedMail) {
    if (!message.from || message.from.value.length === 0) {
      return undefined;
    }
    const { name, address } = message.from.value[0];
    if (!address) {
      return undefined;
    }
    return { name, email: address };
  }

  async uploadAttachments(message: ParsedMail) {
    if (message.attachments.length === 0) {
      return [];
    }

    const files = message.attachments.map((attachment, i) => {
      const filename = attachment.filename ?? `attachment${i}`;
      return {
        file: new AV.File(filename, attachment.content),
        cid: attachment.cid,
      };
    });

    for (const { file } of files) {
      await file.save();
    }

    return files.map(({ file, cid }) => ({ objectId: file.id!, cid }));
  }

  async sendReplyToTicketCreator(ticket: Ticket, content: string, fileIds?: string[]) {
    const supportEmailMessage = await supportEmailMessageService.getLatestMessageByTicketId(
      ticket.id
    );
    if (!supportEmailMessage) {
      return;
    }

    const supportEmail = await supportEmailService.getSupportEmailByEmail(supportEmailMessage.to);
    if (!supportEmail) {
      return;
    }

    const user = await userService.getUser(ticket.authorId);
    if (!user || !user.email) {
      return;
    }

    const attachments = fileIds ? await this.getAttachments(fileIds) : undefined;

    const client = this.createSmtpClient(supportEmail);
    await client.sendMail({
      inReplyTo: supportEmailMessage.messageId,
      references: _.castArray(supportEmailMessage.references).concat(supportEmailMessage.messageId),
      from: {
        name: supportEmail.name,
        address: supportEmail.email,
      },
      to: user.email,
      subject: `Re: ${ticket.title}`,
      html: content,
      attachments,
    });
    client.close();
  }

  async getAttachments(fileIds: string[]) {
    if (fileIds.length === 0) {
      return [];
    }
    const files = await fileService.getFiles(fileIds);
    const attachments: Attachment[] = [];
    for (const file of files) {
      try {
        const res = await axios.get(file.url, { responseType: 'stream' });
        attachments.push({
          filename: file.name,
          content: res.data,
        });
      } catch {} // ignore
    }
    return attachments;
  }

  createSmtpClient(supportEmail: SupportEmail) {
    return nodemailer.createTransport({
      host: supportEmail.smtp.host,
      port: supportEmail.smtp.port,
      secure: supportEmail.smtp.secure,
      auth: {
        user: supportEmail.auth.username,
        pass: supportEmail.auth.password,
      },
    });
  }

  getPlainTextFromMessage(message: ParsedMail) {
    if (message.text) {
      return message.text;
    }
    if (message.html) {
      return html2text(message.html);
    }
    return '';
  }

  async sendReceipt(
    to: string,
    ticketMessageId: string,
    supportEmail: SupportEmail,
    ticket: Ticket
  ) {
    const view = {
      ticket: {
        title: ticket.title,
        content: ticket.content,
      },
    };
    const subject = Mustache.render(supportEmail.receipt.subject, view);
    const text = Mustache.render(supportEmail.receipt.text, view);

    const client = this.createSmtpClient(supportEmail);
    await client.sendMail({
      inReplyTo: ticketMessageId,
      references: ticketMessageId,
      from: {
        name: supportEmail.name,
        address: supportEmail.email,
      },
      to,
      subject,
      text,
    });
    client.close();
  }
}

export const emailService = new EmailService();
