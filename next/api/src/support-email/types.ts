export interface CheckNewMessageJobData {
  type: 'checkNewMessage';
}

export interface ProcessMessageJobData {
  type: 'processMessage';
  supportEmail: string;
  mailbox: string;
  messageUid: number;
}

export type JobData = CheckNewMessageJobData | ProcessMessageJobData;

export interface CreateSupportEmailMessageData {
  from?: string;
  to: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  subject?: string;
  html?: string;
  date?: Date;
  attachments?: { objectId: string; cid?: string }[];
  ticketId: string;
  replyId?: string;
}
