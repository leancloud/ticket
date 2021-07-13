import AV from 'leancloud-storage';

import { Pointer } from '../../utils/av';
import { Category, INVALID_CATEGORY } from '../category';
import { Group } from '../group';
import { Organization } from '../organization';
import { User } from '../user';

const STATUS = {
  NEW: 50,
  WAITING_CUSTOMER_SERVIVE: 120,
  WAITING_CUSTOMER: 160,
  PRE_FULFILLED: 220,
  FULFILLED: 250,
  CLOSED: 280,
};

export interface TicketData {
  id: string;
  nid: number;
  category: Category;
  title: string;
  content: string;
  author: User;
  assignee?: User;
  organization?: Organization;
  group?: Group;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketConditions {
  id?: string | string[];
  authorId?: string;
  assigneeId?: string;
  groupId?: string | string[];
  categoryId?: string;
  status?: number | number[];
  evaluationStar?: 0 | 1;
  createdAt_gt?: Date;
  createdAt_gte?: Date;
  createdAt_lt?: Date;
  createdAt_lte?: Date;
}

export interface FindTicketsOptions {
  skip?: number;
  limit?: number;
  sort?: { key: string; order?: 'asc' | 'desc' }[];
  authOptions?: AV.AuthOptions;
}

export class Ticket {
  readonly id: string;
  readonly nid: number;
  readonly category: Category;
  readonly title: string;
  readonly content: string;
  readonly author: User;
  readonly assignee?: User;
  readonly organization?: Organization;
  readonly group?: Group;
  readonly status: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  static readonly STATUS = STATUS;

  constructor(data: TicketData) {
    this.id = data.id;
    this.nid = data.nid;
    this.category = data.category;
    this.title = data.title;
    this.content = data.content;
    this.author = data.author;
    this.assignee = data.assignee;
    this.organization = data.organization;
    this.group = data.group;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async find(conditions: TicketConditions, options?: FindTicketsOptions): Promise<Ticket[]> {
    const query = new AV.Query<AV.Object>('Ticket');
    query.select(
      'nid',
      'category',
      'title',
      'content',
      'author',
      'assignee',
      'organization',
      'group',
      'status'
    );
    query.include('author', 'assignee', 'organization', 'group');

    if (conditions.id !== undefined) {
      if (typeof conditions.id === 'string') {
        query.equalTo('objectId', conditions.id);
      } else {
        if (conditions.id.length === 1) {
          query.equalTo('objectId', conditions.id[0]);
        } else {
          query.containedIn('objectId', conditions.id);
        }
      }
    }

    // author
    if (conditions.authorId) {
      query.equalTo('author', Pointer('_User', conditions.authorId));
    }

    // assignee
    if (conditions.assigneeId) {
      query.equalTo('assignee', Pointer('_User', conditions.assigneeId));
    } else if (conditions.assigneeId === '') {
      query.doesNotExist('assignee');
    }

    // group
    if (conditions.groupId) {
      if (typeof conditions.groupId === 'string') {
        query.equalTo('group', Pointer('Group', conditions.groupId));
      } else {
        if (conditions.groupId.length === 1) {
          query.equalTo('group', Pointer('Group', conditions.groupId[0]));
        } else {
          const pointers = conditions.groupId.map((id) => Pointer('Group', id));
          query.containedIn('group', pointers);
        }
      }
    } else if (conditions.groupId === '') {
      query.doesNotExist('group');
    }

    // status
    if (conditions.status !== undefined) {
      if (typeof conditions.status === 'number') {
        query.equalTo('status', conditions.status);
      } else {
        if (conditions.status.length === 1) {
          query.equalTo('status', conditions.status[0]);
        } else {
          query.containedIn('status', conditions.status);
        }
      }
    }

    // category
    if (conditions.categoryId) {
      query.equalTo('category.objectId', conditions.categoryId);
    }

    // evaluation.star
    if (conditions.evaluationStar !== undefined) {
      query.equalTo('evaluation.star', conditions.evaluationStar);
    }

    // createdAt
    if (conditions.createdAt_gt) {
      query.greaterThan('createdAt', conditions.createdAt_gt);
    }
    if (conditions.createdAt_gte) {
      query.greaterThanOrEqualTo('createdAt', conditions.createdAt_gte);
    }
    if (conditions.createdAt_lt) {
      query.lessThan('createdAt', conditions.createdAt_lt);
    }
    if (conditions.createdAt_lte) {
      query.lessThanOrEqualTo('createdAt', conditions.createdAt_lte);
    }

    if (options?.sort) {
      options.sort.forEach(({ key, order }) => {
        if (!order || order === 'asc') {
          query.addAscending(key);
        } else {
          query.addDescending(key);
        }
      });
    }

    if (options?.skip !== undefined) {
      query.skip(options.skip);
    }
    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const [objects, categories] = await Promise.all([
      query.find(options?.authOptions),
      Category.getAll(),
    ]);
    const categoryMap = categories.reduce<Record<string, Category>>((map, c) => {
      map[c.id] = c;
      return map;
    }, {});

    return objects.map((obj) => {
      return new Ticket({
        id: obj.id!,
        nid: obj.get('nid'),
        category: categoryMap[obj.get('category').objectId] ?? INVALID_CATEGORY,
        title: obj.get('title'),
        content: obj.get('content'),
        author: User.fromAVObject(obj.get('author')),
        assignee: obj.has('assignee') ? User.fromAVObject(obj.get('assignee')) : undefined,
        organization: obj.has('organization')
          ? Organization.fromAVObject(obj.get('organization'))
          : undefined,
        group: obj.has('group') ? Group.fromAVObject(obj.get('group')) : undefined,
        status: obj.get('status'),
        createdAt: obj.createdAt!,
        updatedAt: obj.updatedAt!,
      });
    });
  }
}
