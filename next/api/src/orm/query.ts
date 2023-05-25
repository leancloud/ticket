import AV from 'leancloud-storage';
import _ from 'lodash';

import { Model } from './model';
import { Preloader, preloaderFactory } from './preloader';
import { RelationName } from './relation';

export interface AuthOptions {
  sessionToken?: string;
  useMasterKey?: boolean;
}

export type AVQuery = AV.Query<AV.Object>;

const staticQuery = new AV.Query<AV.Object>('_');

function merge(where: any, modifier: (query: AVQuery) => void) {
  (staticQuery as any)._where = where;
  modifier(staticQuery);
  (staticQuery as any)._where = {};
}

const queryModifiers = {
  '==': (where: any, key: string, value: any) => {
    merge(where, (q) => q.equalTo(key, value));
  },
  '!=': (where: any, key: string, value: any) => {
    merge(where, (q) => q.notEqualTo(key, value));
  },
  '>': (where: any, key: string, value: any) => {
    merge(where, (q) => q.greaterThan(key, value));
  },
  '>=': (where: any, key: string, value: any) => {
    merge(where, (q) => q.greaterThanOrEqualTo(key, value));
  },
  '<': (where: any, key: string, value: any) => {
    merge(where, (q) => q.lessThan(key, value));
  },
  '<=': (where: any, key: string, value: any) => {
    merge(where, (q) => q.lessThanOrEqualTo(key, value));
  },
  in: (where: any, key: string, value: any[]) => {
    if (value.length === 1) {
      queryModifiers['=='](where, key, value[0]);
    } else {
      merge(where, (q) => q.containedIn(key, value));
    }
  },
  'not-in': (where: any, key: string, value: any[]) => {
    if (value.length) {
      if (value.length === 1) {
        queryModifiers['!='](where, key, value[0]);
      } else {
        merge(where, (q) => q.notContainedIn(key, value));
      }
    }
  },
  exists: (where: any, key: string) => {
    merge(where, (q) => q.exists(key));
  },
  'not-exists': (where: any, key: string) => {
    merge(where, (q) => q.doesNotExist(key));
  },
  'starts-with': (where: any, key: string, value: string) => {
    merge(where, (q) => q.startsWith(key, value));
  },
  matches: (where: any, key: string, query: AVQuery) => {
    merge(where, (q) => q.matchesQuery(key, query));
  },
};

export type QueryCommand = keyof typeof queryModifiers;

type ValuesType<T> = T extends (where: any, key: string, ...values: infer V) => void ? V : never;

export type QueryBunch<M extends typeof Model> = (query: Query<M>) => void;

export type OrderType = 'asc' | 'desc';

export interface PreloadOptions {
  onQuery?: (query: QueryBuilder<any>) => void;
  authOptions?: AuthOptions;
}

interface QueryPreloader {
  preloader: Preloader;
  authOptions?: AuthOptions;
}

export class Query<M extends typeof Model> {
  private orConditions: any[] = [];
  private andConditions: any[] = [];
  private condition: any = {};

  private skipCount?: number;
  private limitCount?: number;
  private orderKeys: Record<string, OrderType> = {};
  private selectList: string[] = [];

  private preloaders: Record<string, QueryPreloader> = {};

  constructor(protected model: M) {}

  private appendAndCondition(condition?: any) {
    if (!_.isEmpty(this.condition)) {
      this.andConditions.push(this.condition);
      this.condition = {};
    }
    if (!_.isEmpty(condition)) {
      this.andConditions.push(condition);
    }
  }

  private getAndCondition() {
    if (_.isEmpty(this.condition)) {
      switch (this.andConditions.length) {
        case 0:
          return this.condition;
        case 1:
          return this.andConditions[0];
        default:
          return { $and: this.andConditions };
      }
    }
    if (this.andConditions.length === 0) {
      return this.condition;
    }
    return { $and: this.andConditions.concat(this.condition) };
  }

  private appendOrCondition(condition?: any) {
    const andCondition = this.getAndCondition();
    if (!_.isEmpty(andCondition)) {
      this.orConditions.push(andCondition);
      this.andConditions = [];
      this.condition = {};
    }
    if (!_.isEmpty(condition)) {
      this.orConditions.push(condition);
    }
  }

  getRawCondition() {
    const andCondition = this.getAndCondition();
    if (_.isEmpty(andCondition)) {
      switch (this.orConditions.length) {
        case 0:
          return andCondition;
        case 1:
          return this.orConditions[0];
        default:
          return { $or: this.orConditions };
      }
    }
    if (this.orConditions.length === 0) {
      return andCondition;
    }
    return { $or: this.orConditions.concat(andCondition) };
  }

  clone(): Query<M> {
    const query = new Query(this.model);

    query.orConditions = this.orConditions.slice();
    query.andConditions = this.andConditions.slice();
    query.condition = { ...this.condition };

    query.skipCount = this.skipCount;
    query.limitCount = this.limitCount;
    query.orderKeys = { ...this.orderKeys };
    query.selectList = [...this.selectList];

    query.preloaders = { ...this.preloaders };

    return query;
  }

  setRawCondition(condition: any): Query<M> {
    const query = this.clone();
    query.appendAndCondition(condition);
    return query;
  }

  where<Cmd extends QueryCommand>(
    key: string,
    command: Cmd,
    ...values: ValuesType<typeof queryModifiers[Cmd]>
  ): Query<M>;
  where(bunch: QueryBunch<M>): Query<M>;
  where(key: any, command?: any, ...values: any[]) {
    const query = this.clone();
    if (typeof key === 'string') {
      const modifier = queryModifiers[command as QueryCommand];
      modifier(query.condition, key, values[0]);
    } else {
      const queryBuilder = new QueryBuilder(this.model);
      key(queryBuilder);
      query.appendAndCondition(queryBuilder.getRawCondition());
    }
    return query;
  }

  orWhere<Cmd extends QueryCommand>(
    key: string,
    command: Cmd,
    ...values: ValuesType<typeof queryModifiers[Cmd]>
  ): Query<M>;
  orWhere(bunch: QueryBunch<M>): Query<M>;
  orWhere(key: any, command?: any, ...values: any[]) {
    const query = this.clone();
    if (typeof key === 'string') {
      query.appendOrCondition();
      const modifier = queryModifiers[command as QueryCommand];
      modifier(query.condition, key, values[0]);
    } else {
      const queryBuilder = new QueryBuilder(this.model);
      key(queryBuilder);
      query.appendOrCondition(queryBuilder.getRawCondition());
    }
    return query;
  }

  relatedTo(model: typeof Model, key: string, id: string): Query<M>;
  relatedTo(model: Model, key: string): Query<M>;
  relatedTo(model: typeof Model | Model, key: string, id?: string): Query<M> {
    let object: ReturnType<typeof Model.ptr>;
    if (id) {
      object = (model as typeof Model).ptr(id);
    } else {
      object = (model as Model).toPointer();
    }
    return this.where('$relatedTo', '==', { key, object });
  }

  skip(count: number): Query<M> {
    const query = this.clone();
    query.skipCount = count;
    return query;
  }

  limit(count: number): Query<M> {
    const query = this.clone();
    query.limitCount = count;
    return query;
  }

  paginate(page: number, pageSize: number): Query<M> {
    return this.skip((page - 1) * pageSize).limit(pageSize);
  }

  orderBy(key: string, orderType: OrderType = 'asc'): Query<M> {
    const query = this.clone();
    query.orderKeys[key] = orderType;
    return query;
  }

  select(...list: string[]) {
    const query = this.clone();
    list.forEach((col) => query.selectList.push(col));
    return query;
  }

  preload<K extends RelationName<M>>(key: K, options?: PreloadOptions): Query<M> {
    const query = this.clone();

    const preloader = preloaderFactory(this.model, key);
    if (options) {
      preloader.queryModifier = options.onQuery;
      query.preloaders[key] = {
        preloader,
        authOptions: options.authOptions,
      };
    } else {
      query.preloaders[key] = { preloader };
    }

    return query;
  }

  buildAVQuery(): AVQuery {
    const avQuery = new AV.Query<AV.Object>(this.model.getClassName());
    (avQuery as any)._where = this.getRawCondition();
    if (this.skipCount !== undefined) {
      avQuery.skip(this.skipCount);
    }
    if (this.limitCount !== undefined) {
      avQuery.limit(this.limitCount);
    }
    if (this.selectList.length > 0) {
      avQuery.select(...this.selectList);
    }
    Object.entries(this.orderKeys).forEach(([key, type]) => {
      if (type === 'asc') {
        avQuery.addAscending(key);
      } else {
        avQuery.addDescending(key);
      }
    });
    return avQuery;
  }

  async find(options?: AuthOptions): Promise<InstanceType<M>[]> {
    if (this.limitCount === 0) {
      return [];
    }

    const avQuery = this.buildAVQuery();
    const preloaders = Object.values(this.preloaders);

    await Promise.all(preloaders.map(({ preloader }) => preloader.beforeQuery?.({ avQuery })));
    const avObjects = await avQuery.find(options);
    await Promise.all(preloaders.map(({ preloader }) => preloader.afterQuery?.({ avObjects })));

    const items = avObjects.map((o) => this.model.fromAVObject(o));
    await Promise.all(
      preloaders.map(({ preloader, authOptions }) => preloader.load(items, authOptions ?? options))
    );

    return items;
  }

  async first(options?: AuthOptions): Promise<InstanceType<M> | undefined> {
    const items = await this.limit(1).find(options);
    return items[0];
  }

  count(options?: AuthOptions): Promise<number> {
    return this.buildAVQuery().count(options);
  }

  async findAndCount(options?: AuthOptions): Promise<[InstanceType<M>[], number]> {
    if (this.limitCount === 0) {
      return [[], 0];
    }

    const avQuery = this.buildAVQuery();
    const preloaders = Object.values(this.preloaders);

    await Promise.all(preloaders.map(({ preloader }) => preloader.beforeQuery?.({ avQuery })));
    const [avObjects, count] = await avQuery.findAndCount(options);
    await Promise.all(preloaders.map(({ preloader }) => preloader.afterQuery?.({ avObjects })));

    const items = avObjects.map((o) => this.model.fromAVObject(o));
    await Promise.all(
      preloaders.map(({ preloader, authOptions }) => preloader.load(items, authOptions ?? options))
    );

    return [items, count];
  }
}

export class QueryBuilder<M extends typeof Model> extends Query<M> {
  clone() {
    return this;
  }

  first(options?: AuthOptions) {
    return super.clone().first(options);
  }

  find(options?: AuthOptions) {
    return super.clone().find(options);
  }
}
