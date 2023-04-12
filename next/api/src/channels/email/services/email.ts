import _ from 'lodash';
import AV from 'leancloud-storage';
import axios from 'axios';
import { Job, Queue } from 'bull';
import { FetchMessageObject, ImapFlow } from 'imapflow';
import { ParsedMail, simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';
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
    this.queue = createQueue('support_address', {
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 3,
      },
    });
    this.queue.process((job) => this.processJob(job));
    this.queue.on('error', console.error);
  }

  async checkNewMessages() {
    const supportAddresses = await supportEmailService.getSupportEmails();
    const count = 1;
    supportAddresses.forEach((addr) => {
      this.dispatchCreateEmailTicketJob(addr, count);
    });
  }

  async dispatchCreateEmailTicketJob(supportEmail: SupportEmail, count: number) {
    const client = this.createImapClient(supportEmail);
    await client.connect();

    const range = this.getMessageUidRange(supportEmail.lastUid);
    let uids = await this.getMessageUids(client, range);

    await client.logout();

    if (uids.length) {
      uids = uids.slice(0, count);
      await this.createProcessMessageJobs(supportEmail.email, uids, supportEmail.categoryId);
      await supportEmailService.updateLastUid(supportEmail, uids[uids.length - 1]);
    }
  }

  createImapClient(supportEmail: SupportEmail) {
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

  getMessageUidRange(lastUid: number | undefined) {
    if (lastUid === undefined) {
      return '*';
    }
    return `${lastUid + 1}:*`;
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

  async createProcessMessageJobs(email: string, uids: number[], categoryId: string) {
    const jobDatas = uids.map<{ data: JobData }>((uid) => {
      return {
        data: {
          type: 'processMessage',
          email,
          uid,
          categoryId,
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
    }
  }

  async processMessage(data: ProcessMessageJobData) {
    const supportEmail = await supportEmailService.getSupportEmailByEmail(data.email);
    if (!supportEmail) {
      return;
    }

    const client = this.createImapClient(supportEmail);
    await client.connect();
    const source = await this.getMessageSource(client, data.uid);
    await client.logout();

    const message = await simpleParser(source);
    if (message.inReplyTo) {
      await this.createReplyByMessage(message, data);
    } else {
      await this.createTicketByMessage(message, data);
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

  async createTicketByMessage(message: ParsedMail, data: ProcessMessageJobData) {
    const from = this.getMessageFrom(message);
    if (!from || !message.messageId) {
      return;
    }

    const author = await userService.getOrCreateUserByEmailAndName(from.email, from.name);
    const attachments = await this.uploadAttachments(message);
    const ticket = await ticketService.createTicketFromEmail(
      author,
      data.categoryId,
      message.subject,
      message.text,
      attachments.map((a) => a.objectId)
    );
    await supportEmailMessageService.create({
      from: from.email,
      to: data.email,
      messageId: message.messageId,
      inReplyTo: message.inReplyTo,
      references: message.references ? _.castArray(message.references) : undefined,
      subject: message.subject || '',
      html: message.html || '',
      text: message.text || '',
      date: message.date,
      attachments,
      ticketId: ticket.id,
    });
  }

  async createReplyByMessage(message: ParsedMail, data: ProcessMessageJobData) {
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
      // 可能回复的邮件还没处理完成, 稍后重试
      throw new Error('retry');
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
      content: message.text ?? '',
      fileIds: attachments.map((a) => a.objectId),
    });
    await supportEmailMessageService.create({
      from: from.email,
      to: data.email,
      messageId: message.messageId,
      inReplyTo: message.inReplyTo,
      references: message.references ? _.castArray(message.references) : undefined,
      subject: message.subject || '',
      html: message.html || '',
      text: message.text || '',
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
      subject: `RE: ${ticket.title}`,
      text: content,
      attachments,
    });
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
}

export const emailService = new EmailService();
