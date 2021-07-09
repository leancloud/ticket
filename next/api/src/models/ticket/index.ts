import AV from 'leancloud-storage';

import { Pointer } from '../../utils/av';
import { Organization } from '../organization';
import { User } from '../user';

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
  createdAt_gt?: Date;
  createdAt_gte?: Date;
  createdAt_lt?: Date;
  createdAt_lte?: Date;

  status?: number;
  status_in?: number[];

  groupId?: string;
  groupId_in?: string[];

  assigneeId?: string;

  authorId?: string;

  categoryId?: string;

  evaluationStar?: 0 | 1;
}

export interface FindTicketsOptions {
  skip?: number;
  limit?: number;
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
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: TicketData) {
    this.id = data.id;
    this.nid = data.nid;
    this.categoryId = data.categoryId;
    this.title = data.title;
    this.content = data.content;
    this.author = data.author;
    this.assignee = data.assignee;
    this.organization = data.organization;
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
      'status',
      'createdAt'
    );
    query.include('author', 'assignee', 'organization', 'group');

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

    // status
    if (conditions.status !== undefined) {
      query.equalTo('status', conditions.status);
    }
    if (conditions.status_in) {
      query.containedIn('status', conditions.status_in);
    }

    // assignee
    if (conditions.assigneeId !== undefined) {
      if (conditions.assigneeId) {
        query.equalTo('assignee', Pointer('_User', conditions.assigneeId));
      } else {
        query.doesNotExist('assignee');
      }
    }

    // author
    if (conditions.authorId) {
      query.equalTo('author', Pointer('_User', conditions.authorId));
    }

    // category
    if (conditions.categoryId) {
      query.equalTo('category.objectId', conditions.categoryId);
    }

    // evaluation.star
    if (conditions.evaluationStar !== undefined) {
      query.equalTo('evaluation.star', conditions.evaluationStar);
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
        assignee: obj.has('assignee')
          ? User.fromAVObject(obj.get('assignee'))
          : undefined,
        organization: obj.has('organization')
          ? Organization.fromAVObject(obj.get('organization'))
          : undefined,
        // groupId: obj.get('group')?.id || undefined,
        status: obj.get('status'),
        createdAt: obj.createdAt!,
        updatedAt: obj.updatedAt!,
      });
    });
  }
}
