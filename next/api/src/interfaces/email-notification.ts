export type EventType = 'ticketRepliedByCustomerService';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
}

export interface MessageConfig {
  text?: string;
  html?: string;
}

export interface EventConfig {
  type: EventType;
  from?: string;
  to: string;
  subject: string;
  message: MessageConfig;
}

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
  events: EventConfig[];
}

export interface SetEmailNotificationData {
  send: {
    smtp: SmtpConfig;
  };
  events: EventConfig[];
}
