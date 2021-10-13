import { Notification } from '@/model/Notification';
import { TicketListItemResponse } from './ticket';

export class NotificationResponse {
  constructor(readonly notification: Notification) {}

  toJSON() {
    return {
      id: this.notification.id,
      ticket: this.notification.ticket
        ? new TicketListItemResponse(this.notification.ticket)
        : undefined,
      latestAction: this.notification.latestAction,
      unreadCount: this.notification.unreadCount,
      createdAt: this.notification.createdAt.toISOString(),
      updatedAt: this.notification.updatedAt.toISOString(),
    };
  }
}
