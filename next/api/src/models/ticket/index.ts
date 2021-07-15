import AV from 'leancloud-storage';

import { Categories, Category, CategoryPathItem } from '../category';
import { Group } from '../group';
import { User } from '../user';

export interface TicketFilters {
  id?: string | string[];
  authorId?: string;
  assigneeId?: string;
  groupId?: string | string[];
  status?: number | number[];
  evaluationStar?: number;
  createdAtGT?: Date;
  createdAtLT?: Date;
  createdAtGTE?: Date;
  createdAtLTE?: Date;
}

export function makeQuery({
  id,
  authorId,
  assigneeId,
  groupId,
  status,
  evaluationStar,
  createdAtGT,
  createdAtLT,
  createdAtGTE,
  createdAtLTE,
}: TicketFilters): AV.Query<AV.Object> {
  const query = new AV.Query<AV.Object>('Ticket');

  if (id !== undefined) {
    if (typeof id === 'string') {
      query.equalTo('objectId', id);
    } else {
      query.containedIn('objectId', [...id]);
    }
  }

  if (authorId) {
    query.equalTo('author', User.pointer(authorId));
  }

  if (assigneeId !== undefined) {
    if (assigneeId) {
      query.equalTo('assignee', User.pointer(assigneeId));
    } else {
      query.doesNotExist('assignee');
    }
  }

  if (groupId !== undefined) {
    if (typeof groupId === 'string') {
      if (groupId) {
        query.equalTo('group', Group.pointer(groupId));
      } else {
        query.doesNotExist('group');
      }
    } else {
      query.containedIn('group', groupId.map(Group.pointer));
    }
  }

  if (status) {
    if (typeof status === 'number') {
      query.equalTo('status', status);
    } else {
      query.containedIn('status', status);
    }
  }

  if (evaluationStar !== undefined) {
    query.equalTo('evaluation.star', evaluationStar);
  }

  if (createdAtGT) {
    query.greaterThan('createdAt', createdAtGT);
  }
  if (createdAtLT) {
    query.lessThan('createdAt', createdAtLT);
  }
  if (createdAtGTE) {
    query.greaterThanOrEqualTo('createdAt', createdAtGTE);
  }
  if (createdAtLTE) {
    query.lessThanOrEqualTo('createdAt', createdAtLTE);
  }

  return query;
}

export interface TicketItemData {
  id: string;
  nid: number;
  title: string;
  category: Category;
  categoryPath: CategoryPathItem[];
  author: User;
  assignee?: User;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TicketItem {
  id: string;
  nid: number;
  title: string;
  category: Category;
  categoryPath: CategoryPathItem[];
  author: User;
  assignee?: User;
  group?: Group | null;
  status: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: TicketItemData) {
    this.id = data.id;
    this.nid = data.nid;
    this.title = data.title;
    this.category = data.category;
    this.categoryPath = data.categoryPath;
    this.author = data.author;
    this.assignee = data.assignee;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      nid: this.nid,
      title: this.title,
      category: {
        id: this.category.id,
        name: this.category.name,
      },
      categoryPath: this.categoryPath,
      author: this.author.toJSON(),
      assignee: this.assignee?.toJSON(),
      group: this.group,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

export interface FindOptions {
  user?: { sessionToken: string };
  sort?: { key: string; order?: 'asc' | 'desc' }[];
  skip?: number;
  limit?: number;
  count?: boolean;
  includeGroup?: boolean;
}

export interface FindResults {
  tickets: TicketItem[];
  totalCount?: number;
}

export class Ticket {
  static async find(filters: TicketFilters, options?: FindOptions): Promise<FindResults> {
    const query = makeQuery(filters);
    query.select('nid', 'title', 'category', 'author', 'assignee', 'status');
    query.include('author', 'assignee');
    if (options) {
      if (options.sort) {
        options.sort.forEach(({ key, order }) => {
          if (!order || order === 'asc') {
            query.addAscending(key);
          } else {
            query.addDescending(key);
          }
        });
      }
      if (options.skip) {
        query.skip(options.skip);
      }
      if (options.limit) {
        query.limit(options.limit);
      }
      if (options.includeGroup) {
        query.select('group').include('group');
      }
    }

    const authOptions = {
      sessionToken: options?.user?.sessionToken,
    };

    const [objects, categories, totalCount] = await Promise.all([
      query.find(authOptions),
      Categories.create(),
      options?.count ? query.count(authOptions) : undefined,
    ]);

    const tickets = objects.map((obj) => {
      const categoryId: string = obj.get('category').objectId;

      const item = new TicketItem({
        id: obj.id!,
        nid: obj.get('nid'),
        title: obj.get('title'),
        category: categories.get(categoryId),
        categoryPath: categories.getPath(categoryId),
        author: User.fromAVObject(obj.get('author')),
        assignee: obj.has('assignee') ? User.fromAVObject(obj.get('assignee')) : undefined,
        status: obj.get('status'),
        createdAt: obj.createdAt!,
        updatedAt: obj.updatedAt!,
      });

      if (options?.includeGroup) {
        item.group = obj.has('group') ? Group.fromAVObject(obj.get('group')) : null;
      }

      return item;
    });

    return { tickets, totalCount };
  }
}

export default Ticket;
