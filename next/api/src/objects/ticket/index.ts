import AV from 'leancloud-storage';

import { Pointer } from '../../utils/av';
import { Category, getSome as getSomeCategories, INVALID_CATEGORY } from '../category';

export interface Ticket {
  id: string;
  nid: number;
  title: string;
  content?: string;
  categoryId: string;
  authorId: string;
  author?: {
    id: string;
    username: string;
    name?: string;
    email?: string;
  };
  assigneeId?: string;
  assignee?: {
    id: string;
    username: string;
    name?: string;
    email?: string;
  };
  groupId?: string;
  group?: {
    id: string;
    name: string;
  };
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

type With<T extends Ticket, K extends keyof Ticket> = T & Required<Pick<Ticket, K>>;

type TransformFunc = (tickets: Ticket[], objects: AV.Object[]) => Promise<void> | void;

type AVObjectQuery = AV.Query<AV.Object>;

type AVQueryModifier = (query: AVObjectQuery) => void;

interface QueryOrder {
  key: string;
  order?: 'asc' | 'desc';
}

export interface QueryResult<T extends Ticket> {
  tickets: T[];
  totalCount?: number;
}

const selectKeys = ['nid', 'title', 'category', 'author', 'assignee', 'group', 'status'];

class Query<T extends Ticket> {
  private _keys: string[] = selectKeys;
  private _includes: string[] = [];
  private _transforms: TransformFunc[] = [];
  private _queryModifiers: AVQueryModifier[] = [];
  private _sort: QueryOrder[] = [];
  private _skip?: number;
  private _limit?: number;
  private _count?: boolean;
  private _sessionToken?: string;
  private _useMasterKey?: boolean;

  clone(): Query<T> {
    const query = new Query();
    query._keys = [...this._keys];
    query._includes = [...this._includes];
    query._transforms = [...this._transforms];
    query._queryModifiers = [...this._queryModifiers];
    query._sort = [...this._sort];
    query._skip = this._skip;
    query._limit = this._limit;
    query._count = this._count;
    query._sessionToken = this._sessionToken;
    query._useMasterKey = this._useMasterKey;
    return query as Query<T>;
  }

  withContent(): Query<With<T, 'content'>> {
    const query = this.clone();
    query._keys.push('content');
    query._transforms.push((tickets, objects) => {
      for (const [i, obj] of objects.entries()) {
        tickets[i].content = obj.get('content');
      }
    });
    return query as any;
  }

  withAuthor(): Query<With<T, 'author'>> {
    const query = this.clone();
    query._includes.push('author');
    query._transforms.push((tickets, objects) => {
      objects.forEach((obj, i) => {
        const author: AV.Object = obj.get('author');
        tickets[i].author = {
          id: author.id!,
          username: author.get('username'),
          name: author.get('name') ?? undefined,
          email: author.get('email') ?? undefined,
        };
      });
    });
    return query as any;
  }

  withAssignee(): Query<T> {
    const query = this.clone();
    query._includes.push('assignee');
    query._transforms.push((tickets, objects) => {
      objects.forEach((obj, i) => {
        const assignee: AV.Object = obj.get('assignee');
        if (assignee) {
          tickets[i].assignee = {
            id: assignee.id!,
            username: assignee.get('username'),
            name: assignee.get('name') ?? undefined,
            email: assignee.get('email') ?? undefined,
          };
        }
      });
    });
    return query as any;
  }

  withGroup(): Query<T> {
    const query = this.clone();
    query._includes.push('group');
    query._transforms.push((tickets, objects) => {
      objects.forEach((obj, i) => {
        const group: AV.Object = obj.get('group');
        if (group) {
          tickets[i].group = {
            id: group.id!,
            name: group.get('name'),
          };
        }
      });
    });
    return query as any;
  }

  withEverything(): Query<Required<Ticket>> {
    return this.withContent().withAuthor().withAssignee() as any;
  }

  filterById(id: string | string[]): Query<T> {
    const query = this.clone();
    if (typeof id === 'string') {
      query._queryModifiers.push((q) => q.equalTo('objectId', id));
    } else {
      query._queryModifiers.push((q) => q.containedIn('objectId', id));
    }
    return query;
  }

  filterByAuthorId(id: string): Query<T> {
    const query = this.clone();
    this._queryModifiers.push((q) => q.equalTo('author', Pointer('_User', id)));
    return query;
  }

  filterByAssigneeId(id: string): Query<T> {
    const query = this.clone();
    if (id) {
      query._queryModifiers.push((q) => q.equalTo('assignee', Pointer('_User', id)));
    } else {
      query._queryModifiers.push((q) => q.doesNotExist('assignee'));
    }
    return query;
  }

  filterByCategoryId(id: string): Query<T> {
    const query = this.clone();
    query._queryModifiers.push((q) => q.equalTo('category.objectId', id));
    return query;
  }

  filterByGroupId(id: string | string[]): Query<T> {
    const query = this.clone();
    if (typeof id === 'string') {
      if (id) {
        query._queryModifiers.push((q) => q.equalTo('group', Pointer('Group', id)));
      } else {
        query._queryModifiers.push((q) => q.doesNotExist('group'));
      }
    } else {
      const pointers = id.map((id) => Pointer('Group', id));
      query._queryModifiers.push((q) => q.containedIn('group', pointers));
    }
    return query;
  }

  filterByStatus(value: number | number[]): Query<T> {
    const query = this.clone();
    if (typeof value === 'number') {
      query._queryModifiers.push((q) => q.equalTo('status', value));
    } else {
      query._queryModifiers.push((q) => q.containedIn('status', value));
    }
    return query;
  }

  filterByEvaluationStar(star: number): Query<T> {
    const query = this.clone();
    query._queryModifiers.push((q) => q.equalTo('evaluation.star', star));
    return query;
  }

  filterByCreatedAtGT(value: Date): Query<T> {
    const query = this.clone();
    query._queryModifiers.push((q) => q.greaterThan('createdAt', value));
    return query;
  }

  filterByCreatedAtGTE(value: Date): Query<T> {
    const query = this.clone();
    query._queryModifiers.push((q) => q.greaterThanOrEqualTo('createdAt', value));
    return query;
  }

  filterByCreatedAtLT(value: Date): Query<T> {
    const query = this.clone();
    query._queryModifiers.push((q) => q.lessThan('createdAt', value));
    return query;
  }

  filterByCreatedAtLTE(value: Date): Query<T> {
    const query = this.clone();
    query._queryModifiers.push((q) => q.lessThanOrEqualTo('createdAt', value));
    return query;
  }

  sortBy(orders: QueryOrder[]): Query<T> {
    const query = this.clone();
    query._sort.push(...orders);
    return query;
  }

  skip(count: number): Query<T> {
    const query = this.clone();
    query._skip = count;
    return query;
  }

  limit(count: number): Query<T> {
    const query = this.clone();
    query._limit = count;
    return query;
  }

  inUserView(user: { sessionToken: string }): Query<T> {
    const query = this.clone();
    query._useMasterKey = false;
    query._sessionToken = user.sessionToken;
    return query;
  }

  inStaffView(): Query<T> {
    const query = this.clone();
    query._sessionToken = undefined;
    query._useMasterKey = true;
    return query;
  }

  count(): Query<T> {
    const query = this.clone();
    query._count = true;
    return query;
  }

  private build(): AVObjectQuery {
    const query = new AV.Query<AV.Object>('Ticket');
    query.select(this._keys);
    query.include(this._includes);
    this._queryModifiers.forEach((func) => func(query));
    this._sort.forEach(({ key, order }) => {
      if (!order || order === 'asc') {
        query.addAscending(key);
      } else {
        query.addDescending(key);
      }
    });
    if (this._limit !== undefined) {
      query.limit(this._limit);
    }
    return query as AVObjectQuery;
  }

  async exec(): Promise<QueryResult<T>> {
    const avQuery = this.build();
    const authOptions = {
      sessionToken: this._sessionToken,
      useMasterKey: this._useMasterKey,
    };
    const [objects, totalCount] = await Promise.all([
      avQuery.find(authOptions),
      this._count ? avQuery.count(authOptions) : undefined,
    ]);
    const tickets: Ticket[] = objects.map((obj) => ({
      id: obj.id!,
      nid: obj.get('nid'),
      title: obj.get('title'),
      categoryId: obj.get('category').objectId,
      authorId: obj.get('author').id,
      assigneeId: obj.get('assignee')?.id ?? undefined,
      groupId: obj.get('group')?.id ?? undefined,
      status: obj.get('status'),
      createdAt: obj.createdAt!,
      updatedAt: obj.updatedAt!,
    }));
    await Promise.all(this._transforms.map((t) => t(tickets, objects)));
    return { tickets, totalCount } as QueryResult<T>;
  }
}

export const query = () => new Query();

export type CategoryPath = { id: string; name: string }[];

export async function fillCategoryInfo<T extends { categoryId: string }>(
  tickets: T[]
): Promise<
  (T & {
    category: Category;
    categoryPath: CategoryPath;
  })[]
> {
  const categories = await getSomeCategories(tickets.map((t) => t.categoryId));
  const categoryMap = categories.reduce<Record<string, Category>>((map, c) => {
    map[c.id] = c;
    return map;
  }, {});
  return tickets.map((t) => {
    const category = categoryMap[t.categoryId] ?? INVALID_CATEGORY;
    const categoryPath: CategoryPath = [];
    if (category !== INVALID_CATEGORY) {
      let current = category;
      while (current.parentId) {
        categoryPath.unshift({ id: current.id, name: current.name });
        const parent = categoryMap[current.parentId];
        if (!parent) {
          break;
        }
        current = parent;
      }
    }
    return { ...t, category, categoryPath };
  });
}
