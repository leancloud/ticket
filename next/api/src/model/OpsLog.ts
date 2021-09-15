import { Model, field, pointerId, pointTo } from '../orm';
import { Group } from './Group';
import { Ticket } from './Ticket';
import { User } from './User';

export type Action =
  | 'selectAssignee'
  | 'changeAssignee'
  | 'changeGroup'
  | 'changeFields'
  | 'replySoon'
  | 'replyWithNoContent'
  | 'resolve'
  | 'close'
  | 'reopen';

export class OpsLog extends Model {
  @field()
  action!: Action;

  @field()
  data!: Record<string, any>;

  @field()
  internal?: boolean;

  @pointerId(() => Ticket)
  ticketId!: string;

  @pointTo(() => Ticket)
  ticket?: Ticket;

  static async selectAssignee(ticket: Ticket, assignee: User): Promise<OpsLog> {
    return this.create(
      {
        ACL: {
          [ticket.authorId]: { read: true },
          'role:customerService': { read: true },
        },
        ticketId: ticket.id,
        action: 'selectAssignee',
        data: {
          assignee: makeTinyUserInfo(assignee),
        },
      },
      {
        ignoreBeforeHooks: true,
      }
    );
  }

  static async changeGroup(ticket: Ticket, group: Group | null, operator: User): Promise<OpsLog> {
    return this.create(
      {
        ACL: {
          'role:customerService': { read: true },
        },
        ticketId: ticket.id,
        action: 'changeGroup',
        data: {
          group: group ? makeTinyGroupInfo(group) : null,
          operator: makeTinyUserInfo(operator),
        },
        internal: true,
      },
      {
        ignoreBeforeHooks: true,
      }
    );
  }
}

function makeTinyUserInfo(user: User) {
  return {
    objectId: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
  };
}

function makeTinyGroupInfo(group: Group) {
  return {
    objectId: group.id,
    name: group.name,
  };
}
