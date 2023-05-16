import { SupportEmail } from '../entities/SupportEmail';

export class SupportEmailService {
  getSupportEmails() {
    return SupportEmail.queryBuilder().find({ useMasterKey: true });
  }

  getSupportEmailByEmail(email: string) {
    return SupportEmail.queryBuilder().where('email', '==', email).first({ useMasterKey: true });
  }
}

export const supportEmailService = new SupportEmailService();
