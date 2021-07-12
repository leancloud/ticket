import AV from 'leancloud-storage';

import { Pointer } from '../../utils/av';
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
  categoryId: string;
  title: string;
  content: string;
  author: User;
  assignee?: User;
  organization?: Organization;
  groupId?: string;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FindTicketsConditions {
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
  readonly categoryId: string;
  readonly title: string;
  readonly content: string;
  readonly author: User;
  readonly assignee?: User;
  readonly organization?: Organization;
  readonly status: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  static readonly STATUS = STATUS;

  constructor(data: TicketData) {
    this.id = data.id;
    this.nid = data.nid;
    this.categoryId = data.categoryId;
    this.title = data.title;
    this.content = data.content;
    this.author = data.author;
    this.assignee = data.assignee;
    this.organization = data.organization;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async find(
    conditions: FindTicketsConditions,
    options?: FindTicketsOptions
  ): Promise<Ticket[]> {
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

    // author
    if (conditions.authorId) {
      query.equalTo('author', Pointer('_User', conditions.authorId));
    }

    // assignee
    if (conditions.assigneeId !== undefined) {
      if (conditions.assigneeId) {
        query.equalTo('assignee', Pointer('_User', conditions.assigneeId));
      } else {
        query.doesNotExist('assignee');
      }
    }

    // group
    if (conditions.groupId !== undefined) {
      if (conditions.groupId) {
        if (Array.isArray(conditions.groupId)) {
          const pointers = conditions.groupId.map((id) => Pointer('Group', id));
          query.containedIn('group', pointers);
        } else {
          query.equalTo('group', Pointer('Group', conditions.groupId));
        }
      } else {
        query.doesNotExist('group');
      }
    }

    // status
    if (conditions.status !== undefined) {
      if (Array.isArray(conditions.status)) {
        query.containedIn('status', conditions.status);
      } else {
        query.equalTo('status', conditions.status);
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
    } else {
      query.limit(100);
    }

    const objects = await query.find(options?.authOptions);

    return objects.map((obj) => {
      return new Ticket({
        id: obj.id!,
        nid: obj.get('nid'),
        categoryId: obj.get('category').objectId,
        title: obj.get('title'),
        content: obj.get('content'),
        author: User.fromAVObject(obj.get('author')),
        assignee: obj.has('assignee') ? User.fromAVObject(obj.get('assignee')) : undefined,
        organization: obj.has('organization')
          ? Organization.fromAVObject(obj.get('organization'))
          : undefined,
        groupId: obj.get('group')?.id || undefined,
        status: obj.get('status'),
        createdAt: obj.createdAt!,
        updatedAt: obj.updatedAt!,
      });
    });
  }
}
