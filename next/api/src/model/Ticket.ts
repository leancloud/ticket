import AV from 'leanengine';
import _ from 'lodash';

import { config } from '../config';
import notification from '../notification';
import {
  ACLBuilder,
  Model,
  UpdateData,
  belongsTo,
  commands,
  field,
  pointerId,
  pointerIds,
  pointTo,
  hasManyThroughPointerArray,
  hasOne,
} from '../orm';
import htmlify from '../utils/htmlify';
import { Category, CategoryManager } from './Category';
import { File } from './File';
import { Group } from './Group';
import { Notification } from './Notification';
import { OperateAction, OpsLogCreator } from './OpsLog';
import { Organization } from './Organization';
import { Reply, TinyReplyInfo } from './Reply';
import { Role } from './Role';
import { TinyUserInfo, User, systemUser } from './User';
import { Vacation } from './Vacation';
import { Watch } from './Watch';

export enum STATUS {
  // 0~99 未开始处理
  NEW = 50, // 新工单，还没有技术支持人员回复
  // 100~199 处理中
  WAITING_CUSTOMER_SERVICE = 120,
  WAITING_CUSTOMER = 160,
  // 200~299 处理完成
  PRE_FULFILLED = 220, // 技术支持人员点击“解决”时会设置该状态，用户确认后状态变更为 FULFILLED
  FULFILLED = 250, // 已解决
  CLOSED = 280, // 已关闭
}

export interface Evaluation {
  star: number;
  content: string;
}

export interface LatestReply extends Omit<TinyReplyInfo, 'objectId'> {
  // 较早记录的数据没有 objectId
  objectId?: string;
}

export interface Tag {
  key: string;
  value: string;
}

export interface CreateReplyData {
  author: User;
  content: string;
  fileIds?: string[];
  internal?: boolean;
}

export class Ticket extends Model {
  static readonly STATUS = STATUS;

  @field()
  nid!: number;

  @field()
  title!: string;

  @field()
  content!: string;

  @field('content_HTML')
  contentHTML!: string;

  @field({
    avObjectKey: 'category',
    // 不 encode ，而是通过 category 设置分类。目的是同时设置分类名称，兼容旧的数据结构。
    encode: false,
    decode: (category) => category.objectId,
  })
  categoryId!: string;

  categoryPath?: Category[];

  @field({
    encode: (c: Category) => c.getTinyInfo(),
    decode: false,
  })
  @belongsTo(() => Category)
  category?: Category;

  @pointerId(() => User)
  authorId!: string;

  @pointTo(() => User)
  author?: User;

  @pointerId(() => User)
  assigneeId?: string;

  @pointTo(() => User)
  assignee?: User;

  @pointerId(() => Group)
  groupId?: string;

  @pointTo(() => Group)
  group?: Group;

  @pointerId(() => Organization)
  organizationId?: string;

  @pointerIds(() => File)
  fileIds?: string[];

  @hasManyThroughPointerArray(() => File)
  files?: File[];

  @field()
  status!: number;

  @field()
  evaluation?: Evaluation;

  @field()
  replyCount?: number;

  // XXX: 这里有个深坑，latestReply.createdAt 和 latestReply.updated 存的是 Date 类型
  // 但由于字段名的原因，API 返回的类型是 string 。存的时候还是要按 Date 来存，不然查询起来就太难受拉
  @field({
    decode: (data) => ({
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    }),
  })
  latestReply?: LatestReply;

  @field()
  joinedCustomerServices?: TinyUserInfo[];

  @field()
  metaData?: Record<string, any>;

  @field()
  tags?: Tag[];

  @field()
  privateTags?: Tag[];

  @hasOne(() => Notification)
  notification?: Notification;

  getUrl(): string {
    return `${config.host}/tickets/${this.nid}`;
  }

  async loadCategoryPath(): Promise<Category[]> {
    if (!this.categoryPath) {
      this.categoryPath = await CategoryManager.getCategoryPath(this.categoryId);
    }
    return this.categoryPath;
  }

  async isCustomerService(user: User): Promise<boolean> {
    return user.id !== this.authorId && user.isCustomerService();
  }

  async reply(this: Ticket, data: CreateReplyData): Promise<Reply> {
    const isCustomerService = await this.isCustomerService(data.author);

    const ACL = new ACLBuilder();
    if (data.internal) {
      ACL.allowCustomerService('read', 'write').allowStaff('read');
    } else {
      ACL.allow(data.author, 'read', 'write')
        .allow(this.authorId, 'read')
        .allowCustomerService('read')
        .allowStaff('read');
      if (this.organizationId) {
        ACL.allowOrgMember(this.organizationId, 'read');
      }
    }

    const reply = await Reply.create(
      {
        ACL,
        content: data.content,
        contentHTML: htmlify(data.content),
        ticket: this, // 避免后续重复获取
        ticketId: this.id,
        author: data.author, // 避免后续重复获取
        authorId: data.author.id,
        isCustomerService,
        fileIds: data.fileIds,
        internal: data.internal || undefined,
      },
      {
        ...data.author.getAuthOptions(),
        ignoreBeforeHook: true,
        ignoreAfterHook: true,
      }
    );

    if (!data.internal) {
      const updateData: UpdateData<Ticket> = {
        latestReply: reply.getTinyInfo(),
        replyCount: commands.inc(),
      };
      if (isCustomerService && data.author !== systemUser) {
        updateData.joinedCustomerServices = commands.pushUniq(data.author.getTinyInfo());
      }
      if (this.status < STATUS.FULFILLED) {
        updateData.status = isCustomerService
          ? STATUS.WAITING_CUSTOMER
          : STATUS.WAITING_CUSTOMER_SERVICE;
      }

      await this.update(updateData, { currentUser: data.author });

      this.load(isCustomerService ? 'author' : 'assignee', { useMasterKey: true })
        .then((to) => {
          notification.emit('replyTicket', {
            ticket: this,
            reply,
            from: data.author,
            to,
          });
        })
        .catch(console.error); // TODO: Sentry
    }

    return reply;
  }

  async resetUnreadCount(this: Ticket, user: User) {
    const notification = await Notification.queryBuilder()
      .where('ticket', '==', this.toPointer())
      .where('user', '==', user.toPointer())
      .first(user);
    if (notification?.unreadCount) {
      await notification.update({ unreadCount: 0 }, { currentUser: user });
    }
  }

  async operate(action: OperateAction, operator: User) {
    const isCustomerService = await this.isCustomerService(operator);
    const status = getActionStatus(action, isCustomerService);
    const data: UpdateData<Ticket> = { status };
    if (isCustomerService && operator !== systemUser) {
      data.joinedCustomerServices = commands.pushUniq(operator.getTinyInfo());
    }
    const ticket = await this.update(data, { currentUser: operator });

    if (isCustomerService && this.isClosed() !== ticket.isClosed()) {
      Watch.queryBuilder()
        .where('ticket', '==', ticket.toPointer())
        .find({ useMasterKey: true })
        .then((watches) => {
          let userIds = watches.map((w) => w.userId).concat(ticket.authorId);
          if (ticket.assigneeId) {
            userIds.push(ticket.assigneeId);
          }
          userIds = _.uniq(userIds).filter((id) => id !== operator.id);
          return Notification.upsert(ticket.id, userIds, 'changeStatus');
        })
        .catch(console.error); // TODO: Sentry
    }

    new OpsLogCreator(this).operate(action, operator).create();

    return ticket;
  }

  isClosed(): boolean {
    return (
      this.status === STATUS.PRE_FULFILLED ||
      this.status === STATUS.FULFILLED ||
      this.status === STATUS.CLOSED
    );
  }
}

Ticket.beforeCreate(async ({ data, options }) => {
  if (!data.authorId) {
    throw new Error('The authorId is required');
  }
  if (!data.category) {
    throw new Error('The category is required');
  }
  if (!data.content) {
    throw new Error('The content is required');
  }

  await Promise.all([
    (async () => {
      if (!data.assigneeId) {
        const assignee = await selectAssignee(data.category!);
        if (assignee) {
          data.assignee = assignee; // 避免后续重复获取
          data.assigneeId = assignee.id;
        }
      }
    })(),
    (async () => {
      if (!data.groupId) {
        const group = await selectGroup(data.category!);
        if (group) {
          data.group = group; // 避免后续重复获取
          data.groupId = group.id;
        }
      }
    })(),
  ]);

  const ACL = new ACLBuilder().allowCustomerService('read', 'write').allowStaff('read');
  if (data.authorId) {
    ACL.allow(data.authorId, 'read', 'write');
  }
  if (data.organizationId) {
    ACL.allowOrgMember(data.organizationId, 'read', 'write');
  }
  data.ACL = ACL;
  data.status = Ticket.STATUS.NEW;
  data.contentHTML = htmlify(data.content);

  options.ignoreBeforeHook = true;
  options.ignoreAfterHook = true;
});

Ticket.afterCreate(async ({ instance: ticket }) => {
  const [author, assignee, group] = await Promise.all([
    ticket.load('author', { useMasterKey: true }),
    ticket.assigneeId ? ticket.load('assignee', { useMasterKey: true }) : undefined,
    ticket.groupId ? ticket.load('group', { useMasterKey: true }) : undefined,
  ]);

  const opsLogCreator = new OpsLogCreator(ticket);
  if (assignee) {
    opsLogCreator.selectAssignee(assignee);
  }
  if (group) {
    opsLogCreator.changeGroup(group, systemUser);
  }
  // TODO: Sentry
  opsLogCreator.create().catch(console.error);

  notification.emit('newTicket', { ticket, from: author!, to: assignee });
});

Ticket.beforeUpdate(({ options }) => {
  options.ignoreBeforeHook = true;
  options.ignoreAfterHook = true;
});

Ticket.afterUpdate(async ({ instance: ticket, data, options }) => {
  const currentUser = (options.currentUser as User) ?? systemUser;
  const opsLogCreator = new OpsLogCreator(ticket);

  if (data.assigneeId !== undefined) {
    if (data.assigneeId) {
      const assignee = await ticket.load('assignee', { useMasterKey: true });
      if (assignee) {
        opsLogCreator.changeAssignee(assignee, currentUser);
      }
      notification.emit('changeAssignee', { ticket, from: currentUser, to: assignee });
    } else {
      opsLogCreator.changeAssignee(null, currentUser);
      notification.emit('changeAssignee', { ticket, from: currentUser });
    }
  }

  if (data.groupId !== undefined) {
    if (data.groupId) {
      const group = await ticket.load('group', { useMasterKey: true });
      if (group) {
        opsLogCreator.changeGroup(group, currentUser);
      }
    } else {
      opsLogCreator.changeGroup(null, currentUser);
    }
  }

  if (data.category) {
    opsLogCreator.changeCategory(data.category, currentUser);
  }

  if (data.evaluation) {
    if (ticket.assigneeId) {
      const assignee = await ticket.load('assignee', { useMasterKey: true });
      notification.emit('ticketEvaluation', { ticket, from: currentUser, to: assignee });
    } else {
      notification.emit('ticketEvaluation', { ticket, from: currentUser });
    }
  }

  if (data.status && ticket.isClosed()) {
    // TODO: next 支持定义云函数后改回本地调用
    AV.Cloud.run('statsTicket', { ticketId: ticket.id }, { remote: true });
  }

  // TODO: Sentry
  opsLogCreator.create().catch(console.error);
});

async function selectAssignee(
  category: Category,
  customerServices?: User[]
): Promise<User | undefined> {
  if (!customerServices) {
    const [csRole, vacationerIds] = await Promise.all([
      Role.getCustomerServiceRole(),
      Vacation.getVacationerIds(),
    ]);
    customerServices = await User.queryBuilder()
      .relatedTo(csRole, 'users')
      .where('objectId', 'not-in', vacationerIds)
      .find({ useMasterKey: true });
  }

  const candidates = customerServices.filter((user) => {
    if (!user.categoryIds) {
      return false;
    }
    return user.categoryIds.includes(category.id);
  });

  if (candidates.length) {
    return _.sample(candidates);
  }

  if (category.parentId) {
    const parent = await category.load('parent');
    if (parent) {
      return selectAssignee(parent, customerServices);
    }
  }
}

async function selectGroup(category: Category): Promise<Group | undefined> {
  if (category.groupId) {
    return category.load('group', { useMasterKey: true });
  }
  if (category.parentId) {
    const parent = await category.load('parent');
    if (parent) {
      return selectGroup(parent);
    }
  }
}

function getActionStatus(action: OperateAction, isCustomerService: boolean): STATUS {
  switch (action) {
    case 'replyWithNoContent':
      return STATUS.WAITING_CUSTOMER;
    case 'replySoon':
      return STATUS.WAITING_CUSTOMER_SERVICE;
    case 'resolve':
      return isCustomerService ? STATUS.PRE_FULFILLED : STATUS.FULFILLED;
    case 'close':
      return STATUS.CLOSED;
    case 'reopen':
      return STATUS.WAITING_CUSTOMER;
  }
}
