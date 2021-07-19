import AV from 'leancloud-storage';

import { Categories, Category, CategoryPathItem } from '../category';
import { Group } from '../group';
import { User } from '../user';

export interface TicketFilter {
  authorId?: string;
  assigneeId?: string;
  categoryId?: string | string[];
  groupId?: string | string[];
  status?: number | number[];
  evaluationStar?: number;
  createdAt?: [Date | undefined, Date | undefined];
}

export function makeQuery({
  authorId,
  assigneeId,
  categoryId,
  groupId,
  status,
  evaluationStar,
  createdAt,
}: TicketFilter): AV.Query<AV.Object> {
  const query = new AV.Query<AV.Object>('Ticket');

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

  if (categoryId) {
    if (typeof categoryId === 'string') {
      query.equalTo('category.objectId', categoryId);
    } else {
      query.containedIn('category.objectId', categoryId);
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

  if (createdAt) {
    const [since, until] = createdAt;
    if (since) {
      query.greaterThanOrEqualTo('createdAt', since);
    }
    if (until) {
      query.lessThan('createdAt', until);
    }
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
      assignee: this.assignee ? this.assignee.toJSON() : null,
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

export interface GetTicketOptions {
  user?: FindOptions['user'];
  includeGroup?: FindOptions['includeGroup'];
}

export interface TicketData extends TicketItemData {
  content: string;
  contentHtml: string;
}

export class Ticket {
  id: string;
  nid: number;
  title: string;
  category: Category;
  categoryPath: CategoryPathItem[];
  author: User;
  assignee?: User;
  group?: Group | null;
  status: number;
  content: string;
  contentHtml: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: TicketData) {
    this.id = data.id;
    this.nid = data.nid;
    this.title = data.title;
    this.category = data.category;
    this.categoryPath = data.categoryPath;
    this.author = data.author;
    this.assignee = data.assignee;
    this.status = data.status;
    this.content = data.content;
    this.contentHtml = data.contentHtml;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async find(filter: TicketFilter, options?: FindOptions): Promise<FindResults> {
    const query = makeQuery(filter);
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

  static async get(id: string, options?: GetTicketOptions): Promise<Ticket> {
    const query = new AV.Query<AV.Object>('Ticket');
    query.include('author', 'assignee');
    if (options?.includeGroup) {
      query.include('group');
    }

    const authOptions = {
      sessionToken: options?.user?.sessionToken,
    };
    const [object, categories] = await Promise.all([
      query.get(id, authOptions),
      Categories.create(),
    ]);

    const categoryId = object.get('category').objectId;
    const ticket = new Ticket({
      id: object.id!,
      nid: object.get('nid'),
      title: object.get('title'),
      category: categories.get(categoryId),
      categoryPath: categories.getPath(categoryId),
      author: User.fromAVObject(object.get('author')),
      assignee: object.has('assignee') ? User.fromAVObject(object.get('assignee')) : undefined,
      status: object.get('status'),
      content: object.get('content'),
      contentHtml: object.get('content_HTML'),
      createdAt: object.createdAt!,
      updatedAt: object.updatedAt!,
    });

    if (options?.includeGroup) {
      ticket.group = object.has('group') ? Group.fromAVObject(object.get('group')) : null;
    }

    return ticket;
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
      assignee: this.assignee ? this.assignee.toJSON() : null,
      group: this.group,
      content: this.content,
      contentHtml: this.contentHtml,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

export default Ticket;
