import { SupportEmail } from '../entities/SupportEmail';

export class SupportEmailService {
  getSupportEmails() {
    return SupportEmail.queryBuilder().find({ useMasterKey: true });
  }

  getSupportEmailByEmail(email: string) {
    return SupportEmail.queryBuilder().where('email', '==', email).first({ useMasterKey: true });
  }

  updateLastUid(supportAddress: SupportEmail, lastUid: number) {
    return supportAddress.update({ lastUid }, { useMasterKey: true });
  }
}

export const supportEmailService = new SupportEmailService();
