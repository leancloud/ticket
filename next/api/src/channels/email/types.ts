export interface CheckNewMessageJobData {
  type: 'checkNewMessage';
}

export interface ProcessMessageJobData {
  type: 'processMessage';
  email: string;
  uid: number;
  categoryId: string;
}

export type JobData = CheckNewMessageJobData | ProcessMessageJobData;

export interface CreateSupportEmailMessageData {
  from?: string;
  to: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  subject: string;
  html: string;
  text: string;
  date?: Date;
  attachments?: { objectId: string; cid?: string }[];
  ticketId: string;
  replyId?: string;
}
