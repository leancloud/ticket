import { Notification } from '@/model/Notification';
import { TicketListItemResponse } from './ticket';

export class NotificationResponse {
  constructor(readonly notification: Notification) {}

  toJSON(
    options: {
      includeTicketMetaKeys?: string[];
    } = {}
  ) {
    return {
      id: this.notification.id,
      ticket: this.notification.ticket
        ? new TicketListItemResponse(this.notification.ticket).toJSON({
            includeMetaKeys: options.includeTicketMetaKeys,
          })
        : undefined,
      unreadCount: this.notification.unreadCount,
      latestAction: this.notification.latestAction,
      latestActionAt: this.notification.latestActionAt?.toISOString(),
      createdAt: this.notification.createdAt.toISOString(),
      updatedAt: this.notification.updatedAt.toISOString(),
    };
  }
}
