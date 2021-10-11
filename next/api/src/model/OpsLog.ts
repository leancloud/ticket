import { ACLBuilder, CreateData, Model, RawACL, field, pointerId, pointTo } from '@/orm';
import { Category } from './Category';
import { Group } from './Group';
import { Ticket } from './Ticket';
import { User } from './User';

export type OperateAction = 'replyWithNoContent' | 'replySoon' | 'resolve' | 'close' | 'reopen';

export type Action =
  | 'selectAssignee'
  | 'changeAssignee'
  | 'changeGroup'
  | 'changeCategory'
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

export class OpsLogCreator {
  private datas: CreateData<OpsLog>[] = [];
  private publicACL: RawACL;
  private internalACL = new ACLBuilder().allowCustomerService('read').allowStaff('read').toJSON();

  constructor(readonly ticket: Ticket) {
    const publicACL = new ACLBuilder()
      .allow(ticket.authorId, 'read')
      .allowCustomerService('read')
      .allowStaff('read');
    if (ticket.organizationId) {
      publicACL.allowOrgMember(ticket.organizationId, 'read');
    }
    this.publicACL = publicACL.toJSON();
  }

  operate(action: OperateAction, operator: User): this {
    this.datas.push({
      ACL: this.publicACL,
      ticketId: this.ticket.id,
      action,
      data: {
        operator: operator.getTinyInfo(),
      },
    });
    return this;
  }

  selectAssignee(assignee: User): this {
    this.datas.push({
      ACL: this.publicACL,
      ticketId: this.ticket.id,
      action: 'selectAssignee',
      data: {
        assignee: assignee.getTinyInfo(),
      },
    });
    return this;
  }

  changeAssignee(assignee: User | null, operator: User): this {
    this.datas.push({
      ACL: this.publicACL,
      ticketId: this.ticket.id,
      action: 'changeAssignee',
      data: {
        assignee: assignee ? assignee.getTinyInfo() : null,
        operator: operator.getTinyInfo(),
      },
    });
    return this;
  }

  changeGroup(group: Group | null, operator: User): this {
    this.datas.push({
      ACL: this.internalACL,
      ticketId: this.ticket.id,
      action: 'changeGroup',
      data: {
        group: group ? group.getTinyInfo() : null,
        operator: operator.getTinyInfo(),
      },
      internal: true,
    });
    return this;
  }

  changeCategory(category: Category, operator: User): this {
    this.datas.push({
      ACL: this.publicACL,
      ticketId: this.ticket.id,
      action: 'changeCategory',
      data: {
        category: category.getTinyInfo(),
        operator: operator.getTinyInfo(),
      },
    });
    return this;
  }

  async create() {
    if (this.datas.length) {
      await OpsLog.createSome(this.datas, {
        ignoreBeforeHook: true,
      });
      this.datas = [];
    }
  }
}
