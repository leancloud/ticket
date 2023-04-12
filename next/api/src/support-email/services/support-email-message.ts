import { Ticket } from '@/model/Ticket';
import { SupportEmailMessage } from '../entities/SupportEmailMessage';
import { CreateSupportEmailMessageData } from '../types';

export class SupportEmailMessageService {
  create(data: CreateSupportEmailMessageData) {
    return SupportEmailMessage.create(data, { useMasterKey: true });
  }

  getByMessageId(messageId: string) {
    return SupportEmailMessage.queryBuilder()
      .where('messageId', '==', messageId)
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
