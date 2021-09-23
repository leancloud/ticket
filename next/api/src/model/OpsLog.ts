import { CreateData, Model, field, pointerId, pointTo } from '../orm';
import { Group } from './Group';
import { OperateAction, Ticket } from './Ticket';
import { User } from './User';

export type Action =
  | 'selectAssignee'
  | 'changeAssignee'
  | 'changeGroup'
  | 'changeFields'
  | OperateAction;

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
}

OpsLog.beforeCreate(({ options }) => {
  // XXX: 旧版在 beforeSave 中设置 OpsLog 的 ACL
  options.ignoreBeforeHook = true;
});

export class OpsLogCreator {
  private datas: CreateData<OpsLog>[] = [];

  selectAssignee(ticket: Ticket, assignee: User): this {
    this.datas.push({
      ACL: {
        [ticket.authorId]: { read: true },
        'role:customerService': { read: true },
      },
      ticketId: ticket.id,
      action: 'selectAssignee',
      data: {
        assignee: assignee.getTinyInfo(),
      },
    });
    return this;
  }

  changeGroup(ticket: Ticket, group: Group | null, operator: User): this {
    this.datas.push({
      ACL: {
        'role:customerService': { read: true },
      },
      ticketId: ticket.id,
      action: 'changeGroup',
      data: {
        group: group ? group.getTinyInfo() : null,
        operator: operator.getTinyInfo(),
      },
      internal: true,
    });
    return this;
  }

  create() {
    if (this.datas.length) {
      // TODO: Sentry
      OpsLog.createSome(this.datas).catch(console.error);
      this.datas = [];
    }
  }
}
