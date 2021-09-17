import _ from 'lodash';

import {
  CreateData,
  Model,
  RawACL,
  UpdateData,
  belongsTo,
  commands,
  field,
  pointerId,
  pointerIds,
  pointTo,
  hasManyThroughPointerArray,
} from '../orm';
import htmlify from '../utils/htmlify';
import { Category, CategoryManager } from './Category';
import { File } from './File';
import { Group } from './Group';
import { OpsLog } from './OpsLog';
import { Organization } from './Organization';
import { Reply, TinyReplyInfo } from './Reply';
import { Role } from './Role';
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

  static STATUS = STATUS;

  static async createTicket({
    title,
    content,
    author,
    category,
    organization,
    fileIds,
    metaData,
  }: CreateTicketData): Promise<Ticket> {
    const [assignee, group] = await Promise.all([selectAssignee(category), selectGroup(category)]);

    const ACL: RawACL = {
      [author.id]: { read: true, write: true },
      'role:customerService': { read: true, write: true },
      'role:staff': { read: true },
    };
    if (organization) {
      const orgRole = 'role:' + organization.id + '_member';
      ACL[orgRole] = { read: true, write: true };
    }

    const ticket = await this.create(
      {
        ACL,
        title,
        content,
        contentHTML: htmlify(content),
        category,
        authorId: author.id,
        assigneeId: assignee?.id,
        groupId: group?.id,
        fileIds,
        metaData,
        status: STATUS.NEW,
      },
      author.getAuthOptions()
    );

    const opsLogDatas: CreateData<OpsLog>[] = [];
    if (assignee) {
      opsLogDatas.push(OpsLog.selectAssignee(ticket, assignee));
    }
    if (group) {
      opsLogDatas.push(OpsLog.changeGroup(ticket, group, systemUser));
    }
    // TODO: Sentry
    OpsLog.createSome(opsLogDatas).catch(console.error);

    return ticket;
  }

  async loadCategoryPath(): Promise<Category[]> {
    if (!this.categoryPath) {
      this.categoryPath = await CategoryManager.getCategoryPath(this.categoryId);
    }
    return this.categoryPath;
  }

  async reply(
    this: Ticket,
    { content, author, isCustomerService, fileIds, internal }: CreateReplyData
  ): Promise<Reply> {
    const ACL: RawACL = {
      [author.id]: { read: true, write: true },
      'role:customerService': { read: true },
      'role:staff': { read: true },
    };
    if (!internal) {
      if (this.authorId !== author.id) {
        ACL[this.authorId] = { read: true };
      }
      if (this.organizationId) {
        const orgRole = 'role:' + this.organizationId + '_member';
        ACL[orgRole] = { read: true };
      }
    }

    const authOptions = author.getAuthOptions();
    const reply = await Reply.create(
      {
        ACL,
        content,
        contentHTML: htmlify(content),
        ticketId: this.id,
        authorId: author.id,
        isCustomerService,
        fileIds,
        internal: internal || undefined,
      },
      authOptions
    );
    reply.author = author;

    if (!internal) {
      const updateData: UpdateData<Ticket> = {
        latestReply: reply.tinyInfo(),
        replyCount: commands.inc(),
      };
      if (isCustomerService) {
        updateData.joinedCustomerServices = commands.pushUniq(author.tinyInfo());
      }
      if (this.status < STATUS.FULFILLED) {
        updateData.status = isCustomerService
          ? STATUS.WAITING_CUSTOMER
          : STATUS.WAITING_CUSTOMER_SERVICE;
      }

      // TODO: Sentry
      this.update(updateData, authOptions).catch(console.error);

      // TODO: notification
    }

    return reply;
  }
}

Ticket.beforeCreate(({ avObject }) => {
  avObject.disableBeforeHook();
  avObject.disableAfterHook();
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
