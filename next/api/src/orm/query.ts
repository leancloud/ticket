import AV from 'leancloud-storage';
import _ from 'lodash';

import { Model } from './model';
import { Preloader, preloaderFactory } from './preloader';
import { RelationName } from './relation';
import { Flat } from './utils';

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

function and(where1: any, where2: any): any {
  const empty1 = _.isEmpty(where1);
  const empty2 = _.isEmpty(where2);
  if (empty1 && empty2) {
    return {};
  } else if (empty1) {
    return { ...where2 };
  } else if (empty2) {
    return { ...where1 };
  } else {
    return { $and: [where1, where2] };
  }
}

function or(where1: any, where2: any): any {
  const where = and(where1, where2);
  if (where.$and) {
    where.$or = where.$and;
    delete where.$and;
  }
  return where;
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
};

export type QueryCommand = keyof typeof queryModifiers;

type ValuesType<T> = T extends (where: any, key: string, ...values: infer V) => void ? V : never;

export type QueryBunch<M extends typeof Model> = (query: Query<M>) => Query<M>;

export type OrderType = 'asc' | 'desc';

export interface PreloadOptions<
  M extends typeof Model,
  K extends RelationName<M> = RelationName<M>
> {
  data?: Flat<NonNullable<InstanceType<M>[K]>>[];
  authOptions?: AuthOptions;
  onQuery?: (query: QueryBuilder<any>) => void;
}

interface QueryPreloader {
  preloader: Preloader;
  authOptions?: AuthOptions;
}

export class Query<M extends typeof Model> {
  private condition: any = {};
  private skipCount?: number;
  private limitCount?: number;
  private orderKeys: Record<string, OrderType> = {};
  private preloaders: Record<string, QueryPreloader> = {};

  constructor(protected model: M) {}

  clone(): Query<M> {
    const query = new Query(this.model);
    query.condition = { ...this.condition };
    query.skipCount = this.skipCount;
    query.limitCount = this.limitCount;
    query.orderKeys = { ...this.orderKeys };
    query.preloaders = { ...this.preloaders };
    return query;
  }

  setRawCondition(condition: any): Query<M> {
    const query = this.clone();
    query.condition = condition;
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
      const newQuery = key(new Query(this.model)) as Query<M>;
      query.condition = and(query.condition, newQuery.condition);
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
      const modifier = queryModifiers[command as QueryCommand];
      const newCondition = {};
      modifier(newCondition, key, values[0]);
      query.condition = or(query.condition, newCondition);
    } else {
      const newQuery = key(new Query(this.model)) as Query<M>;
      query.condition = or(query.condition, newQuery.condition);
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

  orderBy(key: string, orderType: OrderType = 'asc'): Query<M> {
    const query = this.clone();
    query.orderKeys[key] = orderType;
    return query;
  }

  preload<K extends RelationName<M>>(key: K, options?: PreloadOptions<M, K>): Query<M> {
    const query = this.clone();

    const preloader = preloaderFactory(this.model, key);
    if (options?.data) {
      preloader.data = options.data as Model[];
    }
    if (options?.onQuery) {
      preloader.queryModifier = options.onQuery;
    }
    query.preloaders[key] = {
      preloader,
      authOptions: options?.authOptions,
    };

    return query;
  }

  private buildAVQuery(): AVQuery {
    const avQuery = new AV.Query<AV.Object>(this.model.getClassName());
    (avQuery as any)._where = this.condition;
    if (this.skipCount !== undefined) {
      avQuery.skip(this.skipCount);
    }
    if (this.limitCount !== undefined) {
      avQuery.limit(this.limitCount);
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

  private async _find(avQuery: AVQuery, options?: AuthOptions): Promise<InstanceType<M>[]> {
    if (this.limitCount === 0) {
      return [];
    }

    const preloaders = Object.values(this.preloaders);

    await Promise.all(preloaders.map(({ preloader }) => preloader.beforeQuery?.({ avQuery })));
    const objects = await avQuery.find(options);
    await Promise.all(preloaders.map(({ preloader }) => preloader.afterQuery?.({ objects })));

    const items = objects.map((o) => this.model.fromAVObject(o));
    await Promise.all(
      preloaders.map(({ preloader, authOptions }) => preloader.load(items, authOptions ?? options))
    );

    return items;
  }

  find(options?: AuthOptions): Promise<InstanceType<M>[]> {
    return this._find(this.buildAVQuery(), options);
  }

  async first(options?: AuthOptions): Promise<InstanceType<M> | undefined> {
    const items = await this.limit(1).find(options);
    return items[0];
  }

  count(options?: AuthOptions): Promise<number> {
    return this.buildAVQuery().count(options);
  }

  async findAndCount(options?: AuthOptions): Promise<[InstanceType<M>[], number]> {
    const avQuery = this.buildAVQuery();
    return Promise.all([this._find(avQuery, options), avQuery.count(options)]);
  }
}

export class QueryBuilder<M extends typeof Model> extends Query<M> {
  clone() {
    return this;
  }

  first(options?: AuthOptions) {
    return super.clone().first(options);
  }
}
