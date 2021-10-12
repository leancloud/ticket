import AV from 'leanengine';
import _ from 'lodash';

import { Category } from '@/model/Category';
import { Group } from '@/model/Group';
import { OperateAction, OpsLogCreator } from '@/model/OpsLog';
import { Organization } from '@/model/Organization';
import { Evaluation, STATUS, Tag, Ticket } from '@/model/Ticket';
import { systemUser, User } from '@/model/User';
import events from '@/events';
import { commands, UpdateData } from '@/orm';

export class TicketUpdater {
  private organization?: Organization | null;
  private assignee?: User | null;
  private group?: Group | null;

  private data: UpdateData<Ticket> = {};

  private operateAction?: OperateAction;
  private opsLogCreator: OpsLogCreator;

  constructor(private ticket: Ticket) {
    this.opsLogCreator = new OpsLogCreator(ticket);
  }

  setOrganization(organization: Organization | null): this {
    if (organization) {
      this.organization = organization;
      this.data.organizationId = organization.id;
    } else {
      this.organization = null;
      this.data.organizationId = null;
    }
    return this;
  }

  setCategory(category: Category): this {
    this.data.category = category;
    return this;
  }

  setAssignee(assignee: User | null): this {
    if (assignee) {
      this.assignee = assignee;
      this.data.assigneeId = assignee.id;
    } else {
      this.assignee = null;
      this.data.assigneeId = null;
    }
    return this;
  }

  setGroup(group: Group | null): this {
    if (group) {
      this.group = group;
      this.data.groupId = group.id;
    } else {
      this.group = null;
      this.data.groupId = null;
    }
    return this;
  }

  setTags(tags: Tag[]): this {
    this.data.tags = tags;
    return this;
  }

  setPrivateTags(privateTags: Tag[]): this {
    this.data.privateTags = privateTags;
    return this;
  }

  setEvaluation(evaluation: Evaluation): this {
    this.data.evaluation = evaluation;
    return this;
  }

  operate(action: OperateAction): this {
    this.operateAction = action;
    return this;
  }

  private async applyOperation(action: OperateAction, operator: User) {
    const isCustomerService = await this.ticket.isCustomerService(operator);
    switch (action) {
      case 'replyWithNoContent':
        this.data.status = STATUS.WAITING_CUSTOMER;
        break;
      case 'replySoon':
        this.data.status = STATUS.WAITING_CUSTOMER_SERVICE;
        break;
      case 'resolve':
        this.data.status = isCustomerService ? STATUS.PRE_FULFILLED : STATUS.FULFILLED;
        break;
      case 'close':
        this.data.status = STATUS.CLOSED;
        break;
      case 'reopen':
        this.data.status = STATUS.WAITING_CUSTOMER;
        break;
    }

    if (isCustomerService) {
      if (operator !== systemUser) {
        this.data.joinedCustomerServices = commands.pushUniq(operator.getTinyInfo());
      }
      // XXX: 适配加速器的使用场景
      this.data.unreadCount = commands.inc();
    }
    this.opsLogCreator.operate(action, operator);

    return this;
  }

  isUpdated(): boolean {
    return !_.isEmpty(this.data) || !!this.operateAction;
  }

  private assignRelatedInstance(ticket: Ticket) {
    if (this.organization) {
      ticket.organization = this.organization;
    }
    if (this.assignee) {
      ticket.assignee = this.assignee;
    }
    if (this.group) {
      ticket.group = this.group;
    }
  }

  private async saveOpsLogs(operator: User) {
    if (this.assignee !== undefined) {
      this.opsLogCreator.changeAssignee(this.assignee, operator);
    }

    if (this.group !== undefined) {
      this.opsLogCreator.changeGroup(this.group, operator);
    }

    if (this.data.category) {
      this.opsLogCreator.changeCategory(this.data.category, operator);
    }

    await this.opsLogCreator.create();
  }

  async update(operator: User): Promise<Ticket> {
    if (!this.isUpdated()) {
      return this.ticket;
    }

    if (this.operateAction) {
      await this.applyOperation(this.operateAction, operator);
    }
    const ticket = await this.ticket.update(this.data, {
      ...operator.getAuthOptions(),
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
    });
    this.assignRelatedInstance(ticket);

    this.saveOpsLogs(operator).catch((error) => {
      // TODO: Sentry
      console.error('[ERROR] Create OpsLog failed, error:', error);
    });

    events.emit('ticket:updated', {
      originalTicket: {
        id: this.ticket.id,
        nid: this.ticket.nid,
        categoryId: this.ticket.categoryId,
        authorId: this.ticket.authorId,
        organizationId: this.ticket.organizationId,
        assigneeId: this.ticket.assigneeId,
        groupId: this.ticket.groupId,
        title: this.ticket.title,
        content: this.ticket.content,
        status: this.ticket.status,
        createdAt: this.ticket.createdAt.toISOString(),
        updatedAt: this.ticket.updatedAt.toISOString(),
      },
      data: {
        categoryId: this.data.categoryId ?? undefined,
        organizationId: this.data.organizationId,
        assigneeId: this.data.assigneeId,
        groupId: this.data.groupId,
        evaluation: this.data.evaluation ?? undefined,
        status: this.data.status as number | undefined,
      },
      currentUserId: operator.id,
    });

    if (this.ticket.isClosed() !== ticket.isClosed()) {
      // 客服关闭或重新打开工单时增加 unreadCount
      this.ticket
        .isCustomerService(operator)
        .then((isCustomerService) => {
          if (isCustomerService) {
            return ticket.increaseUnreadCount('changeStatus', operator);
          }
        })
        .catch((error) => {
          // TODO: Sentry
          console.error('[ERROR] increase unread count failed:', error);
        });
    }

    if (this.data.status && ticket.isClosed()) {
      // TODO: next 支持定义云函数后改回本地调用
      AV.Cloud.run('statsTicket', { ticketId: ticket.id }, { remote: true });
    }

    return ticket;
  }
}
