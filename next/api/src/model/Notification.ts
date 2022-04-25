import _ from 'lodash';

import { commands, field, Model, pointerId, pointTo } from '@/orm';
import { Ticket } from './Ticket';
import { User } from './User';
import { Category } from './Category';

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

  @pointerId(() => Category)
  categoryId!: string;

  @pointTo(() => Category)
  category?: Category;

  @field()
  unreadCount!: number;

  @field()
  latestAction!: LatestAction;

  @field()
  latestActionAt?: Date;

  static async upsertSome(
    ticketId: string,
    userIds: string[],
    categoryId: string,
    latestAction: LatestAction
  ) {
    userIds = _.uniq(userIds);

    const notifications = await this.queryBuilder()
      .where('ticket', '==', Ticket.ptr(ticketId))
      .where(
        'user',
        'in',
        userIds.map((id) => User.ptr(id))
      )
      .limit(1000)
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
          categoryId,
          latestAction,
          latestActionAt: new Date(),
          unreadCount: 1,
        })),
        { useMasterKey: true }
      ),
      this.updateSome(
        notifications.map((n) => [
          n,
          {
            latestAction,
            latestActionAt: new Date(),
            unreadCount: commands.inc(),
            categoryId,
          },
        ]),
        { useMasterKey: true }
      ),
    ]);
  }

  static async updateCategory(ticketId: string, categoryId: string) {
    const notifications = await this.queryBuilder()
      .where('ticket', '==', Ticket.ptr(ticketId))
      .limit(1000)
      .find({ useMasterKey: true });
    this.updateSome(
      notifications.map((n) => [
        n,
        {
          categoryId,
        },
      ]),
      { useMasterKey: true }
    );
  }
}
