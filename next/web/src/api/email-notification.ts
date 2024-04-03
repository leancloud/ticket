import { http } from '@/leancloud';

export type EmailNotificationEvent = 'ticketRepliedByCustomerService';

export interface EmailNotification {
  send: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
    };
  };
  events: EmailNotificationEventConfig[];
}

export interface EmailNotificationEventConfig {
  type: EmailNotificationEvent;
  from?: string;
  to: string;
  subject: string;
  message: {
    text?: string;
    html?: string;
  };
}

export interface SetEmailNotificationData {
  send: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password?: string;
    };
  };
  events: EmailNotificationEventConfig[];
}

export async function setEmailNotification(data: SetEmailNotificationData) {
  await http.put('/api/2/email-notification', data);
}

export async function getEmailNotification() {
  const res = await http.get<EmailNotification | null>('/api/2/email-notification');
  return res.data;
}

export async function removeEmailNotification() {
  await http.delete('/api/2/email-notification');
}
