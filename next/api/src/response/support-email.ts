import { SupportEmail } from '@/support-email/entities/SupportEmail';

export class SupportEmailResponse {
  constructor(private supportEmail: SupportEmail) {}

  toJSON() {
    return {
      id: this.supportEmail.id,
      name: this.supportEmail.name,
      email: this.supportEmail.email,
      auth: {
        username: this.supportEmail.auth.username,
      },
      smtp: this.supportEmail.smtp,
      imap: this.supportEmail.imap,
      mailbox: this.supportEmail.mailbox,
      categoryId: this.supportEmail.categoryId,
      receipt: this.supportEmail.receipt,
    };
  }
}
