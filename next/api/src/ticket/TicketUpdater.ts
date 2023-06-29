import AV from 'leanengine';
import _ from 'lodash';

import events from '@/events';
import { ModifyOptions, UpdateData, commands, ACLBuilder } from '@/orm';
import { Category } from '@/model/Category';
import { Group } from '@/model/Group';
import { OperateAction, OpsLogCreator } from '@/model/OpsLog';
import { Organization } from '@/model/Organization';
import { Evaluation, Status, Tag, Ticket } from '@/model/Ticket';
import { systemUser, TinyUserInfo, User } from '@/model/User';

import { TinyReplyInfo } from '@/model/Reply';
import { TicketLog } from '@/model/TicketLog';
import { LangCodeISO6391 } from '@notevenaneko/whatlang-node';

export interface UpdateOptions {
  useMasterKey?: boolean;
  ignoreTrigger?: boolean;
}

export class TicketUpdater {
  private organization?: Organization | null;
  private assignee?: User | null;
  private group?: Group | null;

  private data: UpdateData<Ticket> = {};
  private replyCountIncrement = 0;
  private unreadCountIncrement = 0;
  private joinedCustomerServices: TinyUserInfo[] = [];
  private operateAction?: OperateAction;
  private shouldUpdateACL = false;

  private opsLogCreator: OpsLogCreator;

  constructor(private ticket: Ticket) {
    this.opsLogCreator = new OpsLogCreator(ticket);
  }

  getCurrentACL() {
    const organizationId =
      this.data.organizationId === null
        ? undefined
        : this.data.organizationId ?? this.ticket.organizationId;

    const assigneeId =
      this.data.assigneeId === null ? undefined : this.data.assigneeId ?? this.ticket.assigneeId;

    const builder = new ACLBuilder();
    builder.allowCustomerService('read', 'write');
    builder.allowStaff('read');
    builder.allow(this.ticket.authorId, 'read', 'write');
    if (organizationId) {
      builder.allowOrgMember(organizationId, 'read', 'write');
    }
    if (assigneeId) {
      builder.allow(assigneeId, 'read', 'write');
    }

    return builder.toJSON();
  }

  setOrganization(organization: Organization | null): this {
    if (organization) {
      this.organization = organization;
      this.data.organizationId = organization.id;
    } else {
      this.organization = null;
      this.data.organizationId = null;
    }
    this.shouldUpdateACL = true;
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
    this.shouldUpdateACL = true;
    return this;
  }

  setLanguage(lang: LangCodeISO6391 | null): this {
    this.data.language = lang;
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

  /**
   * NOTE: ONLY FOR TRIGGER ACTION
   */
  addTag(tag: Tag): this {
    if (!this.data.tags) {
      this.data.tags = this.ticket.tags?.slice() ?? [];
    }
    if (Array.isArray(this.data.tags)) {
      const i = this.data.tags.findIndex((t) => t.key === tag.key);
      if (i === -1) {
        this.data.tags.push(tag);
      } else {
        this.data.tags[i].value = tag.value;
      }
    }
    return this;
  }

  /**
   * NOTE: ONLY FOR TRIGGER ACTION
   */
  addPrivateTag(tag: Tag): this {
    if (!this.data.privateTags) {
      this.data.privateTags = this.ticket.privateTags?.slice() ?? [];
    }
    if (Array.isArray(this.data.privateTags)) {
      const i = this.data.privateTags.findIndex((t) => t.key === tag.key);
      if (i === -1) {
        this.data.privateTags.push(tag);
      } else {
        this.data.privateTags[i].value = tag.value;
      }
    }
    return this;
  }

  setEvaluation(evaluation: Evaluation): this {
    this.data.evaluation = evaluation;
    return this;
  }

  setLatestReply(reply: TinyReplyInfo) {
    this.data.latestReply = reply;
    return this;
  }

  setlatestCustomerServiceReplyAt(time: Date) {
    this.data.latestCustomerServiceReplyAt = time;
    return this;
  }

  setfirstCustomerServiceReplyAt(time: Date) {
    this.data.firstCustomerServiceReplyAt = time;
    return this;
  }

  increaseReplyCount(amount = 1) {
    this.replyCountIncrement += amount;
    return this;
  }

  ONLY_FOR_TGB_increaseUnreadCount(amount = 1) {
    this.unreadCountIncrement += amount;
    return this;
  }

  addJoinedCustomerService(user: TinyUserInfo) {
    this.joinedCustomerServices.push(user);
    return this;
  }

  setStatus(status: number) {
    if (this.ticket.status !== status) {
      this.data.status = status;
    }
  }

  operate(action: OperateAction): this {
    if (this.data.status) {
      throw new Error('Cannot operate ticket after change status');
    }
    this.operateAction = action;
    return this;
  }

  private async applyOperation(action: OperateAction, operator: User) {
    const isCustomerService = await operator.isCustomerService();
    switch (action) {
      case 'replyWithNoContent':
        this.data.status = Status.WAITING_CUSTOMER;
        break;
      case 'replySoon':
        this.data.status = Status.WAITING_CUSTOMER_SERVICE;
        break;
      case 'resolve':
        this.data.status = isCustomerService ? Status.PRE_FULFILLED : Status.FULFILLED;
        break;
      case 'close':
        this.data.status = Status.CLOSED;
        break;
      case 'reopen':
        this.data.status = Status.WAITING_CUSTOMER;
        break;
    }

    if (isCustomerService) {
      if (operator !== systemUser) {
        this.data.joinedCustomerServices = commands.pushUniq(operator.getTinyInfo());
      }
      if (this.ticket.isClosed() !== Ticket.Status.isClosed(this.data.status)) {
        // XXX: 适配加速器的使用场景
        this.ONLY_FOR_TGB_increaseUnreadCount();
      }
    }
    this.opsLogCreator.operate(action, operator);

    return this;
  }

  isUpdated(): boolean {
    return (
      !_.isEmpty(this.data) ||
      this.replyCountIncrement > 0 ||
      this.unreadCountIncrement > 0 ||
      this.joinedCustomerServices.length > 0 ||
      this.operateAction !== undefined
    );
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

  private getModifyOptions(operator: User, useMasterKey = false): ModifyOptions {
    const modifyOptions: ModifyOptions = {
      ignoreBeforeHook: true,
      ignoreAfterHook: true,
    };
    if (useMasterKey) {
      modifyOptions.useMasterKey = true;
    } else {
      Object.assign(modifyOptions, operator.getAuthOptions());
    }
    return modifyOptions;
  }

  async update(operator: User, options?: UpdateOptions): Promise<Ticket> {
    if (!this.isUpdated()) {
      return this.ticket;
    }

    if (this.operateAction) {
      await this.applyOperation(this.operateAction, operator);
    }
    if (this.replyCountIncrement) {
      this.data.replyCount = commands.inc(this.replyCountIncrement);
    }
    if (this.unreadCountIncrement) {
      this.data.unreadCount = commands.inc(this.unreadCountIncrement);
    }
    if (this.joinedCustomerServices.length) {
      this.data.joinedCustomerServices = commands.pushUniq(...this.joinedCustomerServices);
    }
    if (this.shouldUpdateACL) {
      this.data.ACL = this.getCurrentACL();
    }

    const ticket = await this.ticket.update(
      this.data,
      this.getModifyOptions(operator, options?.useMasterKey)
    );
    this.assignRelatedInstance(ticket);

    this.saveOpsLogs(operator).catch((error) => {
      // TODO: Sentry
      console.error('[ERROR] Create OpsLog failed, error:', error);
    });

    TicketLog.createByTicket(ticket).catch((error) => {
      console.error('[ERROR] save TicketLog failed, error:', error);
    });

    events.emit('ticket:updated', {
      originalTicket: this.ticket,
      data: {
        categoryId: this.data.category?.id ?? undefined,
        organizationId: this.data.organizationId,
        assigneeId: this.data.assigneeId,
        groupId: this.data.groupId,
        evaluation: this.data.evaluation ?? undefined,
        status: this.data.status as number | undefined,
      },
      updatedTicket: ticket,
      currentUserId: operator.id,
      ignoreTrigger: options?.ignoreTrigger,
    });

    if (this.ticket.isClosed() !== ticket.isClosed()) {
      // 客服关闭或重新打开工单时增加 unreadCount
      operator
        .isCustomerService()
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
