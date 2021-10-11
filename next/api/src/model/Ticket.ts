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
import { TicketUpdater } from '../ticket/TicketUpdater';
import htmlify from '../utils/htmlify';
import { Category, CategoryManager } from './Category';
import { File } from './File';
import { Group } from './Group';
import { LatestAction, Notification } from './Notification';
import { OperateAction } from './OpsLog';
import { Organization } from './Organization';
import { Reply, TinyReplyInfo } from './Reply';
import { TinyUserInfo, User, systemUser } from './User';
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

  @pointTo(() => Organization)
  organization?: Organization;

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

      await this.update(updateData, data.author.getAuthOptions());

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

  async increaseUnreadCount(this: Ticket, latestAction: LatestAction, operator: User) {
    const watches = await Watch.queryBuilder()
      .where('ticket', '==', this.toPointer())
      .find({ useMasterKey: true });
    let userIds = [...watches.map((w) => w.userId), this.authorId];
    if (this.assigneeId) {
      userIds.push(this.assigneeId);
    }
    userIds = userIds.filter((id) => id !== operator.id);
    await Notification.upsert(this.id, userIds, latestAction);
    if (this.authorId !== operator.id) {
      await this.update({ unreadCount: commands.inc() });
    }
  }

  async resetUnreadCount(this: Ticket, user: User, force = false) {
    const notification = await Notification.queryBuilder()
      .where('ticket', '==', this.toPointer())
      .where('user', '==', user.toPointer())
      .first(user);
    if (notification?.unreadCount) {
      await notification.update({ unreadCount: 0 }, user.getAuthOptions());
    }
    if ((this.authorId === user.id && this.unreadCount) || force) {
      await this.update({ unreadCount: 0 });
    }
  }

  operate(action: OperateAction, operator: User): Promise<Ticket> {
    const updater = new TicketUpdater(this);
    updater.operate(action);
    return updater.update(operator);
  }

  isClosed(): boolean {
    return (
      this.status === STATUS.PRE_FULFILLED ||
      this.status === STATUS.FULFILLED ||
      this.status === STATUS.CLOSED
    );
  }
}
