import { EmailNotification } from '@/interfaces/email-notification';

export class EmailNotificationResponse {
  constructor(private data: EmailNotification) {}

  toJSON() {
    return {
      ...this.data,
      send: {
        ...this.data.send,
        smtp: {
          ...this.data.send.smtp,
          // Strip password
          password: undefined,
        },
      },
    };
  }
}
