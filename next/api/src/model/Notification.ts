import _ from 'lodash';

import { commands, field, Model, pointerId, pointTo } from '@/orm';
import { Ticket } from './Ticket';
import { User } from './User';

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
