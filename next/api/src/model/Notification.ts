import _ from 'lodash';

import notification from '../notification';
import { commands, field, Model, pointerId, pointTo } from '../orm';
import { Ticket } from './Ticket';
import { User } from './User';
import { Watch } from './Watch';

export type LatestAction =
  | 'newTicket'
  | 'reply'
  | 'changeAssignee'
  | 'ticketEvaluation'
  | 'changeStatus';

export class Notification extends Model {
  protected static className = 'notification';

  @pointerId(() => User)
  userId!: string;

  @pointTo(() => User)
  user?: User;

  @pointerId(() => Ticket)
  ticketId!: string;

  @pointTo(() => Ticket)
  ticket?: Ticket;

  @field()
  unreadCount!: number;

  @field()
  latestAction!: LatestAction;

  static async upsert(ticketId: string, userIds: string[], latestAction: LatestAction) {
    userIds = _.uniq(userIds);

    const notifications = await this.queryBuilder()
      .where('ticket', '==', Ticket.ptr(ticketId))
      .where(
        'user',
        'in',
        userIds.map((id) => User.ptr(id))
      )
      .find({ useMasterKey: true });

    const unsavedUserIds = _.differenceWith(
      userIds,
      notifications.map((n) => n.userId)
    );

    await Promise.all([
      this.createSome(
        unsavedUserIds.map((userId) => ({
          ACL: {
            [userId]: { read: true, write: true },
          },
          ticketId,
          userId,
          latestAction,
          unreadCount: 1,
        })),
        { useMasterKey: true }
      ),
      this.updateSome(
        notifications.map((n) => [
          n,
          {
            latestAction,
            unreadCount: commands.inc(),
          },
        ]),
        { useMasterKey: true }
      ),
    ]);
  }
}

notification.on('newTicket', ({ ticket }) => {
  if (ticket.assigneeId) {
    Notification.create({
      latestAction: 'newTicket',
      ticketId: ticket.id,
      userId: ticket.assigneeId,
      unreadCount: 1,
    }).catch(console.error); // TODO: Sentry
  }
});

notification.on('replyTicket', async ({ ticket, from, to }) => {
  const watches = await Watch.queryBuilder()
    .where('ticket', '==', ticket.toPointer())
    .find({ useMasterKey: true });

  const userIds = watches.map((w) => w.userId).filter((id) => id !== from.id);
  if (to) {
    userIds.push(to.id);
  }

  // TODO: Sentry
  Notification.upsert(ticket.id, userIds, 'reply').catch(console.log);
});

notification.on('changeAssignee', ({ ticket, to }) => {
  if (to) {
    // TODO: Sentry
    Notification.upsert(ticket.id, [to.id], 'changeAssignee').catch(console.error);
  }
});

notification.on('ticketEvaluation', ({ ticket, to }) => {
  if (to) {
    // TODO: Sentry
    Notification.upsert(ticket.id, [to.id], 'ticketEvaluation').catch(console.error);
  }
});
