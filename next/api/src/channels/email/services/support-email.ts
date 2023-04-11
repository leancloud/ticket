import { Ticket } from '@/model/Ticket';
import { SupportEmail } from '../entities/SupportEmail';
import { SupportEmailTicket } from '../entities/SupportEmailTicket';

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

  getSupportEmailTicketByTicketId(ticketId: string) {
    return SupportEmailTicket.queryBuilder()
      .where('ticket', '==', Ticket.ptr(ticketId))
      .first({ useMasterKey: true });
  }
}

export const supportEmailService = new SupportEmailService();
