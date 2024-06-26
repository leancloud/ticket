import { Ticket } from '@/model/Ticket';
import { SupportEmailMessage } from '@/model/SupportEmailMessage';
import { CreateSupportEmailMessageData } from '@/interfaces/support-email';

export class SupportEmailMessageService {
  create(data: CreateSupportEmailMessageData) {
    return SupportEmailMessage.create(data, { useMasterKey: true });
  }

  getByMessageIds(messageIds: string[]) {
    return SupportEmailMessage.queryBuilder()
      .where('messageId', 'in', messageIds)
      .first({ useMasterKey: true });
  }

  getLatestMessageByTicketId(ticketId: string) {
    return SupportEmailMessage.queryBuilder()
      .where('ticket', '==', Ticket.ptr(ticketId))
      .orderBy('createdAt', 'desc')
      .first({ useMasterKey: true });
  }
}

export const supportEmailMessageService = new SupportEmailMessageService();
