import { CreateData, Model, field, pointerId, pointTo } from '../orm';
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

  static selectAssignee(ticket: Ticket, assignee: User): CreateData<OpsLog> {
    return {
      ACL: {
        [ticket.authorId]: { read: true },
        'role:customerService': { read: true },
      },
      ticketId: ticket.id,
      action: 'selectAssignee',
      data: {
        assignee: assignee.tinyInfo(),
      },
    };
  }

  static changeGroup(ticket: Ticket, group: Group | null, operator: User): CreateData<OpsLog> {
    return {
      ACL: {
        'role:customerService': { read: true },
      },
      ticketId: ticket.id,
      action: 'changeGroup',
      data: {
        group: group?.tinyInfo() ?? null,
        operator: operator.tinyInfo(),
      },
      internal: true,
    };
  }
}

OpsLog.beforeCreate(({ avObject }) => {
  // XXX: 旧版在 beforeSave 中设置 OpsLog 的 ACL
  avObject.disableBeforeHook();
});
