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

import { Reply } from '@/model/Reply';
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
        await this.dispatchCreateEmailTicketJob(supportEmail, maxCount);
      } catch (e) {
        console.error('[Support Email] check new messages', supportEmail.email, e);
      }
    };
    await Promise.all(supportAddresses.map(throat(2, run)));
  }

  async dispatchCreateEmailTicketJob(supportEmail: SupportEmail, count: number) {
    const client = this.createImapClient(supportEmail);
    await client.connect();

    const startUid = supportEmail.lastUid + 1;
    const range = `${startUid}:*`;
    const mailbox = supportEmail.mailbox || 'INBOX';
    let uids = await this.getMessageUids(client, mailbox, range);

    await client.logout();

    // 过滤掉小于起始位置的 UID
    // See: RFC3501 6.4.8 UID Command
    uids = uids.filter((uid) => uid >= startUid);
    uids = uids.slice(0, count);

    if (uids.length) {
      await this.createProcessMessageJobs(supportEmail.email, mailbox, uids);
      await supportEmail.update({ lastUid: _.max(uids) }, { useMasterKey: true });
      console.log('[Support Email] new messages received', {
        email: supportEmail.email,
        mailbox,
        uids,
      });
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

  async getUidNext(client: ImapFlow, mailbox: string) {
    const lock = await client.getMailboxLock(mailbox);
    try {
      return (client.mailbox as MailboxObject).uidNext;
    } finally {
      lock.release();
    }
  }

  async getMessageUids(client: ImapFlow, mailbox: string, range: string) {
    const lock = await client.getMailboxLock(mailbox);
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

  async createProcessMessageJobs(email: string, mailbox: string, uids: number[]) {
    const jobDatas = uids.map<{ data: JobData }>((uid) => {
      return {
        data: {
          type: 'processMessage',
          supportEmail: email,
          mailbox,
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
        return;
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
    const source = await this.getMessageSource(client, data.mailbox, data.messageUid);
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

  async getMessageSource(client: ImapFlow, mailbox: string, uid: number) {
    const lock = await client.getMailboxLock(mailbox);
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
    const messageId = this.getMessageHeaderFirstLine(message, 'Message-ID');
    if (!messageId) {
      return;
    }

    const from = this.getMessageCreator(message);
    if (!from || !from.address) {
      return;
    }

    const author = await userService.getOrCreateUserByEmailAndName(from.address, from.name);
    const attachments = await this.uploadAttachments(message);
    const ticket = await ticketService.createTicketFromEmail(
      author,
      supportEmail.categoryId,
      message.subject,
      this.getPlainTextFromMessage(message),
      attachments.map((a) => a.objectId)
    );
    await supportEmailMessageService.create({
      from: from.address,
      to: jobData.supportEmail,
      messageId,
      inReplyTo: message.inReplyTo,
      references: message.references ? _.castArray(message.references) : undefined,
      subject: message.subject,
      html: message.html || undefined,
      date: message.date,
      attachments,
      ticketId: ticket.id,
    });

    if (supportEmail.receipt.enabled) {
      await this.sendReceipt(from.address, messageId, supportEmail, ticket);
    }
  }

  async createReplyByMessage(message: ParsedMail, jobData: ProcessMessageJobData) {
    const messageId = this.getMessageHeaderFirstLine(message, 'Message-ID');
    if (!messageId) {
      return;
    }

    const from = this.getMessageCreator(message);
    if (!from || !from.address) {
      return;
    }

    const references = this.getMessageReferences(message);
    if (references.length === 0) {
      return;
    }

    // 避免查询条件过长，只用前 50 个
    const supportEmailMessage = await supportEmailMessageService.getByMessageIds(
      references.slice(0, 50)
    );
    if (!supportEmailMessage) {
      // TODO: 可能回复的邮件还没处理完成，添加重试逻辑
      return;
    }

    let ticket = await Ticket.find(supportEmailMessage.ticketId, { useMasterKey: true });
    if (!ticket) {
      return;
    }

    const author = await userService.getUserByEmail(from.address);
    if (!author || author.id !== ticket.authorId) {
      return;
    }

    if (ticket.isClosed()) {
      ticket = await ticket.operate('reopen', author, {
        cascade: true,
        // 这里的 author 是没有 sessionToken 的，而且上面已经判断过 author 是否为 ticket author 了
        // 所以使用 masterKey 操作
        useMasterKey: true,
      });
    }

    const attachments = await this.uploadAttachments(message);
    const reply = await ticket.reply({
      author,
      content: this.getPlainTextFromMessage(message),
      fileIds: attachments.map((a) => a.objectId),
    });
    await supportEmailMessageService.create({
      from: from.address,
      to: jobData.supportEmail,
      messageId,
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

  /**
   * mailparser 解析单行 header 的行为有问题，单独实现一个方法来解析只有一行的 header
   */
  getMessageHeaderFirstLine(message: ParsedMail, key: string) {
    const prefix = `${key}:`;
    const CRLF = '\r\n';
    const line = message.headerLines.find((line) => line.line.startsWith(prefix));
    if (line) {
      const endIndex = line.line.indexOf(CRLF);
      if (endIndex === -1) {
        return line.line.slice(prefix.length).trim();
      }
      return line.line.slice(prefix.length, endIndex).trim();
    }
  }

  getMessageCreator(message: ParsedMail) {
    if (message.replyTo && message.replyTo.value.length) {
      // 优先从 Reply-To 获取，以适配代发邮件的情况
      return message.replyTo.value[0];
    }
    if (message.from && message.from.value.length) {
      return message.from.value[0];
    }
  }

  getMessageReferences(message: ParsedMail) {
    if (!message.references) {
      return [];
    }
    if (typeof message.references === 'string') {
      return [message.references];
    }
    return message.references;
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

  async sendReplyToTicketCreator(ticket: Ticket, reply: Reply) {
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

    const attachments = reply.fileIds ? await this.getAttachments(reply.fileIds) : [];

    const client = this.createSmtpClient(supportEmail);
    try {
      await client.sendMail({
        inReplyTo: supportEmailMessage.messageId,
        references: _.castArray(supportEmailMessage.references).concat(
          supportEmailMessage.messageId
        ),
        from: {
          name: supportEmail.name,
          address: supportEmail.email,
        },
        to: user.email,
        subject: `Re: ${ticket.title}`,
        html: reply.contentHTML,
        attachments,
      });
    } finally {
      client.close();
    }
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
    try {
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
    } finally {
      client.close();
    }
  }
}

export const emailService = new EmailService();
