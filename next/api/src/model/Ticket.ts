import _ from 'lodash';

import { config } from '@/config';
import events from '@/events';
import {
  ACLBuilder,
  Model,
  belongsTo,
  field,
  pointerId,
  pointerIds,
  pointTo,
  hasManyThroughPointer,
  hasManyThroughPointerArray,
  serialize,
} from '@/orm';
import { TicketUpdater, UpdateOptions } from '@/ticket/TicketUpdater';
import htmlify from '@/utils/htmlify';
import { categoryService } from '@/category';
import { Category } from './Category';
import { File } from './File';
import { Group } from './Group';
import { LatestAction, Notification } from './Notification';
import { OperateAction } from './OpsLog';
import { Organization } from './Organization';
import { Reply, TinyReplyInfo } from './Reply';
import { TinyUserInfo, User, systemUser } from './User';
import { Watch } from './Watch';

export class Status {
  // 0~99 未开始处理
  static readonly NEW = 50; // 新工单，还没有技术支持人员回复

  // 100~199 处理中
  static readonly WAITING_CUSTOMER_SERVICE = 120;
  static readonly WAITING_CUSTOMER = 160;

  // 200~299 处理完成
  static readonly PRE_FULFILLED = 220; // 技术支持人员点击“解决”时会设置该状态，用户确认后状态变更为 FULFILLED
  static readonly FULFILLED = 250; // 已解决
  static readonly CLOSED = 280; // 已关闭

  private static openStatuses = [
    Status.NEW,
    Status.WAITING_CUSTOMER,
    Status.WAITING_CUSTOMER_SERVICE,
  ];

  static isOpen(status: number): boolean {
    return Status.openStatuses.includes(status);
  }

  static isClosed(status: number): boolean {
    return !Status.isOpen(status);
  }
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
  static readonly Status = Status;

  @field()
  @serialize()
  nid!: number;

  @field()
  @serialize()
  title!: string;

  @field()
  @serialize()
  content!: string;

  @field('content_HTML')
  contentHTML!: string;

  @field({
    avObjectKey: 'category',
    // 不 encode ，而是通过 category 设置分类。目的是同时设置分类名称，兼容旧的数据结构。
    encode: false,
    decode: (category) => category.objectId,
  })
  @serialize()
  categoryId!: string;

  categoryPath?: Category[];

  @field({
    encode: (c: Category) => c.getTinyInfo(),
    decode: false,
  })
  @belongsTo(() => Category)
  category?: Category;

  @pointerId(() => User)
  @serialize()
  authorId!: string;

  @pointTo(() => User)
  author?: User;

  @pointerId(() => User)
  @serialize()
  assigneeId?: string;

  @pointTo(() => User)
  assignee?: User;

  @pointerId(() => Group)
  @serialize()
  groupId?: string;

  @pointTo(() => Group)
  group?: Group;

  @pointerId(() => Organization)
  @serialize()
  organizationId?: string;

  @pointTo(() => Organization)
  organization?: Organization;

  @pointerIds(() => File)
  fileIds?: string[];

  @hasManyThroughPointerArray(() => File)
  files?: File[];

  @field()
  @serialize()
  status!: number;

  @field()
  evaluation?: Evaluation;

  @field()
  replyCount?: number;

  @field()
  unreadCount?: number;

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
  latestCustomerServiceReplyAt?: Date;

  @field()
  firstCustomerServiceReplyAt?: Date;

  @field()
  joinedCustomerServices?: TinyUserInfo[];

  @field()
  @serialize()
  metaData?: Record<string, any>;

  @field()
  tags?: Tag[];

  @field()
  privateTags?: Tag[];

  @hasManyThroughPointer(() => Notification)
  notifications?: Notification[];

  getUrl(): string {
    return `${config.host}/tickets/${this.nid}`;
  }

  static async fillCategoryPath(tickets: Ticket[]) {
    const categories = await categoryService.find();
    const categoryById = _.keyBy(categories, 'id');
    const pathById: Record<string, Category[]> = {};
    const getPath = (id: string): Category[] => {
      if (id in pathById) {
        return pathById[id];
      }

      const category = categoryById[id];
      if (!category) {
        return [];
      }

      const path = category.parentId ? getPath(category.parentId).concat(category) : [category];
      pathById[id] = path;
      return path;
    };

    tickets.forEach((ticket) => {
      ticket.categoryPath = getPath(ticket.categoryId);
    });
  }

  async loadCategoryPath(): Promise<Category[]> {
    if (!this.categoryPath) {
      await Ticket.fillCategoryPath([this]);
    }
    return this.categoryPath!;
  }

  async isCustomerService(user: User): Promise<boolean> {
    return user.isCustomerService();
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
      const updater = new TicketUpdater(this);
      updater.setLatestReply(reply.getTinyInfo());
      updater.increaseReplyCount();
      if (isCustomerService) {
        if (data.author !== systemUser) {
          updater.addJoinedCustomerService(data.author.getTinyInfo());
          updater.setlatestCustomerServiceReplyAt(reply.createdAt);
          if (!this.firstCustomerServiceReplyAt) {
            updater.setfirstCustomerServiceReplyAt(reply.createdAt);
          }
        }
        // XXX: 适配加速器的使用场景
        updater.ONLY_FOR_TGB_increaseUnreadCount();
      }
      if (this.status < Status.FULFILLED) {
        if (isCustomerService) {
          updater.setStatus(Status.WAITING_CUSTOMER);
        } else {
          if (this.status !== Status.NEW) {
            updater.setStatus(Status.WAITING_CUSTOMER_SERVICE);
          }
        }
      }

      await updater.update(data.author);
    }

    events.emit('reply:created', {
      reply: reply.toJSON(),
      currentUserId: data.author.id,
    });

    return reply;
  }

  async increaseUnreadCount(this: Ticket, latestAction: LatestAction, operator: User) {
    const watches = await Watch.queryBuilder()
      .where('ticket', '==', this.toPointer())
      .find({ useMasterKey: true });
    let userIds = [...watches.map((w) => w.userId), this.authorId];
    if (this.assigneeId) {
      userIds.push(this.assigneeId);
    }
    userIds = userIds.filter((id) => id !== operator.id);
    await Notification.upsertSome(this.id, userIds, this.categoryId, latestAction);
  }

  async resetUnreadCount(this: Ticket, user: User) {
    const notification = await Notification.queryBuilder()
      .where('ticket', '==', this.toPointer())
      .where('user', '==', user.toPointer())
      .first(user);
    if (notification?.unreadCount) {
      await notification.update({ unreadCount: 0 }, user.getAuthOptions());
    }
  }

  operate(action: OperateAction, operator: User, options?: UpdateOptions): Promise<Ticket> {
    const updater = new TicketUpdater(this);
    updater.operate(action);
    return updater.update(operator, options);
  }

  isClosed(): boolean {
    return Status.isClosed(this.status);
  }
}
