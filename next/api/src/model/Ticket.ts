import _ from 'lodash';

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
import { OpsLog, OpsLogCreator } from './OpsLog';
import { Organization } from './Organization';
import { Reply, TinyReplyInfo } from './Reply';
import { Role } from './Role';
import { FieldValue, TicketFieldValue } from './TicketFieldValue';
import { TinyUserInfo, User, systemUser } from './User';
import { Vacation } from './Vacation';

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

export type OperateAction = 'replyWithNoContent' | 'replySoon' | 'resolve' | 'close' | 'reopen';

export interface Evaluation {
  star: number;
  content: string;
}

export interface LatestReply extends Omit<TinyReplyInfo, 'objectId'> {
  // 较早记录的数据没有 objectId
  objectId?: string;
}

export interface CreateTicketData {
  title: string;
  content: string;
  author: User;
  category: Category;
  organization?: Organization;
  fileIds?: string[];
  metaData?: Record<string, any>;
  customFields?: FieldValue[];
}

export interface CreateReplyData {
  content: string;
  author: User;
  isCustomerService: boolean;
  fileIds?: string[];
  internal?: boolean;
}

export class Ticket extends Model {
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
    encode: (c: Category) => ({ objectId: c.id, name: c.name }),
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

  @hasOne(() => Notification)
  notification?: Notification;

  static readonly STATUS = STATUS;

  static async createTicket(data: CreateTicketData, currentUser = data.author): Promise<Ticket> {
    const [assignee, group] = await Promise.all([
      selectAssignee(data.category),
      selectGroup(data.category),
    ]);

    const ACL = new ACLBuilder()
      .allow(data.author, 'read', 'write')
      .allowCustomerService('read', 'write')
      .allowStaff('read');
    if (data.organization) {
      ACL.allowOrgMember(data.organization, 'read', 'write');
    }

    const ticket = await this.create(
      {
        ACL,
        title: data.title,
        content: data.content,
        contentHTML: htmlify(data.content),
        category: data.category,
        authorId: data.author.id,
        assigneeId: assignee?.id,
        groupId: group?.id,
        fileIds: data.fileIds,
        metaData: data.metaData,
        status: STATUS.NEW,
      },
      {
        currentUser,
      }
    );

    if (data.customFields) {
      await TicketFieldValue.create(
        {
          ACL: {},
          ticketId: ticket.id,
          values: data.customFields,
        },
        {
          useMasterKey: true,
        }
      );
    }

    const opsLogCreator = new OpsLogCreator();
    if (assignee) {
      opsLogCreator.selectAssignee(ticket, assignee);
    }
    if (group) {
      opsLogCreator.changeGroup(ticket, group, systemUser);
    }
    opsLogCreator.create();

    return ticket;
  }

  async loadCategoryPath(): Promise<Category[]> {
    if (!this.categoryPath) {
      this.categoryPath = await CategoryManager.getCategoryPath(this.categoryId);
    }
    return this.categoryPath;
  }

  async reply(this: Ticket, data: CreateReplyData): Promise<Reply> {
    const ACL = new ACLBuilder()
      .allow(data.author, 'read', 'write')
      .allowCustomerService('read')
      .allowStaff('read');
    if (!data.internal) {
      ACL.allow(this.authorId, 'read');
      if (this.organizationId) {
        ACL.allow(this.organizationId, 'read');
      }
    }

    const reply = await Reply.create(
      {
        ACL,
        content: data.content,
        contentHTML: htmlify(data.content),
        ticketId: this.id,
        authorId: data.author.id,
        isCustomerService: data.isCustomerService,
        fileIds: data.fileIds,
        internal: data.internal || undefined,
      },
      {
        currentUser: data.author,
      }
    );
    reply.author = data.author;

    if (!data.internal) {
      const updateData: UpdateData<Ticket> = {
        latestReply: reply.getTinyInfo(),
        replyCount: commands.inc(),
      };
      if (data.isCustomerService) {
        updateData.joinedCustomerServices = commands.pushUniq(data.author.getTinyInfo());
      }
      if (this.status < STATUS.FULFILLED) {
        updateData.status = data.isCustomerService
          ? STATUS.WAITING_CUSTOMER
          : STATUS.WAITING_CUSTOMER_SERVICE;
      }

      // TODO: Sentry
      this.update(updateData, { currentUser: data.author }).catch(console.error);

      // TODO: notification
    }

    return reply;
  }

  async resetUnreadCount(this: Ticket, user: User) {
    const authOptions = user.getAuthOptions();
    const notification = await this.load('notification', {
      authOptions,
      onQuery: (query) => query.where('user', '==', user.toPointer()),
    });
    if (notification) {
      await notification.update({ unreadCount: 0 }, authOptions);
    }
  }

  async operate(action: OperateAction, operator: User, isCustomerService: boolean) {
    const status = getActionStatus(action, isCustomerService);
    const data: UpdateData<Ticket> = { status };
    if (isCustomerService) {
      data.joinedCustomerServices = commands.pushUniq(operator.getTinyInfo());
    }
    const ticket = await this.update(data, { currentUser: operator });

    const ACL = new ACLBuilder()
      .allow(this.authorId, 'read')
      .allowCustomerService('read')
      .allowStaff('read');
    if (this.organizationId) {
      ACL.allowOrgMember(this.organizationId, 'read');
    }
    OpsLog.create({
      ACL,
      ticketId: this.id,
      action,
      data: {
        operator: operator.getTinyInfo(),
      },
    }).catch(console.error); // TODO: Sentry

    // TODO: notification
    return ticket;
  }
}

Ticket.beforeCreate(({ options }) => {
  options.ignoreBeforeHook = true;
  options.ignoreAfterHook = true;
});

async function getVacationerIds(): Promise<string[]> {
  const now = new Date();
  const vacations = await Vacation.queryBuilder()
    .where('startDate', '<', now)
    .where('endDate', '>', now)
    .find({ useMasterKey: true });
  return vacations.map((v) => v.vacationerId);
}

async function selectAssignee(
  category: Category,
  customerServices?: User[]
): Promise<User | undefined> {
  if (!customerServices) {
    const [csRole, vacationerIds] = await Promise.all([
      Role.getCustomerServiceRole(),
      getVacationerIds(),
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
    return category.load('group', { authOptions: { useMasterKey: true } });
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
