import _ from 'lodash';

import {
  CreateData,
  Model,
  RawACL,
  belongsTo,
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
import { Role } from './Role';
import { systemUser, User } from './User';
import { Vacation } from './Vacation';

export interface Evaluation {
  star: number;
  content: string;
}

export interface LatestReply {
  objectId?: string;
  content: string;
  author: {
    objectId: string;
    username: string;
    name: string;
    email?: string;
  };
  isCustomerService: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatedTicketData {
  title: string;
  content: string;
  author: User;
  category: Category;
  organization?: Organization;
  fileIds?: string[];
  metaData?: Record<string, any>;
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
  metaData?: Record<string, any>;

  static async createTicket({
    title,
    content,
    author,
    category,
    organization,
    fileIds,
    metaData,
  }: CreatedTicketData): Promise<Ticket> {
    const [assignee, group] = await Promise.all([selectAssignee(category), selectGroup(category)]);

    const ACL: RawACL = {
      [author.id]: { read: true, write: true },
      'role:customerService': { read: true, write: true },
      'role:staff': { read: true },
    };
    if (organization) {
      ACL[organization.id + '_member'] = { read: true, write: true };
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
        status: 50,
      },
      {
        ignoreBeforeHooks: true,
        ignoreAfterHooks: true,
        sessionToken: author.sessionToken,
      }
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
}

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
      .relatedTo(Role, 'users', csRole.id)
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
