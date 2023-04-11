import { Job, Queue } from 'bull';
import { FetchMessageObject, ImapFlow } from 'imapflow';
import { ParsedMail, simpleParser } from 'mailparser';
import { createQueue } from '@/queue';
import { userService } from '@/user/services/user';
import { SupportEmail } from '../entities/SupportEmail';
import { JobData, ProcessMessageJobData } from '../types';
import { supportEmailService } from './support-email';
import { ticketService } from '@/ticket/services/ticket';
import { SupportEmailTicket } from '../entities/SupportEmailTicket';
import { Ticket } from '@/model/Ticket';

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

    console.log({ uids, range });

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
    if (message.headers.has('in-reply-to')) {
      await this.createReplyByMessage(message);
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
    if (!from) {
      return;
    }

    if (!message.messageId) {
      return;
    }

    const author = await userService.getOrCreateUserByEmailAndName(from.email, from.name);
    const ticket = await ticketService.createTicketFromEmail(
      author,
      data.categoryId,
      message.subject,
      message.text
    );
    await this.createSupportEmailTicket(data.email, message.messageId, ticket.id);

    console.log('create ticket', ticket.id, {
      messageId: message.messageId,
      title: message.subject,
      content: message.text,
    });
  }

  async createReplyByMessage(message: ParsedMail) {
    const from = this.getMessageFrom(message);
    if (!from) {
      return;
    }

    const references = message.headers.get('references') as string | string[] | undefined;
    if (!references) {
      return;
    }

    const messageId = Array.isArray(references) ? references[0] : references;

    const supportEmailTicket = await this.getSupportEmailTicketByMessageId(messageId);
    if (!supportEmailTicket) {
      throw new Error(`SupportEmailTicket(messageId=${messageId}) does not exist`);
    }

    const ticket = await Ticket.find(supportEmailTicket.ticketId, { useMasterKey: true });
    if (!ticket) {
      return;
    }

    const author = await userService.getUserByEmail(from.email);
    if (!author || author.id !== ticket.authorId) {
      return;
    }

    const reply = await ticket.reply({
      author,
      content: message.text ?? '',
    });

    console.log('create reply', reply.id, {
      messageId,
      content: message.text,
    });
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

  createSupportEmailTicket(email: string, messageId: string, ticketId: string) {
    return SupportEmailTicket.create(
      {
        ACL: {},
        email,
        messageId,
        ticketId,
      },
      { useMasterKey: true }
    );
  }

  getSupportEmailTicketByMessageId(messageId: string) {
    return SupportEmailTicket.queryBuilder()
      .where('messageId', '==', messageId)
      .first({ useMasterKey: true });
  }
}

export const emailService = new EmailService();
