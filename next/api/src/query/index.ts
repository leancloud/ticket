import AV from 'leancloud-storage';
import _ from 'lodash';

export type AVQuery = AV.Query<AV.Object>;

export type QueryModifier = (query: AVQuery) => AVQuery;

const queryCommands = {
  '==': (key: string, value: any): QueryModifier => {
    return (query) => query.equalTo(key, value);
  },
  '>=': (key: string, value: any): QueryModifier => {
    return (query) => query.greaterThanOrEqualTo(key, value);
  },
  '<=': (key: string, value: any): QueryModifier => {
    return (query) => query.lessThanOrEqualTo(key, value);
  },
  'not-exists': (key: string): QueryModifier => {
    return (query) => query.doesNotExist(key);
  },
  in: (key: string, value: any[]): QueryModifier => {
    if (value.length === 1) {
      return (query) => query.equalTo(key, value[0]);
    }
    return (query) => query.containedIn(key, value);
  },
  init: (key: string, value: any): QueryModifier => {
    return (query) => {
      // @ts-ignore
      query._where = value;
      return query;
    };
  },
};

export type QueryCommand = keyof typeof queryCommands;

type ValuesType<T extends (key: string, ...values: any[]) => any> = T extends (
  key: string,
  ...values: infer P
) => any
  ? P
  : never;

type CommandValuesType<Cmd extends QueryCommand> = ValuesType<typeof queryCommands[Cmd]>;

export type QueryDecoder<T> = (object: AV.Object) => T;

export type Order = 'asc' | 'desc';

export interface AuthOptions {
  sessionToken?: string;
  useMasterKey?: boolean;
}

interface ModelClass {
  new (...args: any[]): any;
  className: string;
  fromAVObject(object: AV.Object): InstanceType<this>;
}

export type QueryBuncher<M extends ModelClass> = (query: Query<M>) => Query<M>;

export type ResultModifier<T> = (items: T[], objects: AV.Object[]) => void | Promise<void>;

export class Query<M extends ModelClass> {
  protected avQueryCondModifiers: QueryModifier[] = [];
  protected avQueryModifiers: QueryModifier[] = [];
  protected resultModifiers: ResultModifier<InstanceType<M>>[] = [];

  constructor(protected model: M) {}

  protected createEmptyQuery(): Query<M> {
    return new Query(this.model);
  }

  protected createEmptyAVQuery(): AVQuery {
    return new AV.Query<AV.Object>(this.model.className);
  }

  protected clone(): Query<M> {
    const query = new Query(this.model);
    query.avQueryCondModifiers = [...this.avQueryCondModifiers];
    query.avQueryModifiers = [...this.avQueryModifiers];
    query.resultModifiers = [...this.resultModifiers];
    return query;
  }

  where<Cmd extends QueryCommand>(
    key: string,
    cmd: Cmd,
    ...values: CommandValuesType<Cmd>
  ): Query<M>;
  where(buncher: QueryBuncher<M>): Query<M>;
  where(key: any, cmd?: any, ...values: any[]) {
    const query = this.clone();
    if (typeof key === 'string') {
      // @ts-ignore
      const modifier = queryCommands[cmd](key, ...values) as QueryModifier;
      query.avQueryCondModifiers.push(modifier);
    } else {
      const newQuery = key(this.createEmptyQuery()) as Query<M>;
      if (query.avQueryCondModifiers.length === 0) {
        query.avQueryCondModifiers = [...newQuery.avQueryCondModifiers];
      } else {
        const newAVQuery = newQuery.buildAVQuery();
        const prevModifier = _.flow(query.avQueryCondModifiers);
        query.avQueryCondModifiers = [(avQuery) => AV.Query.and(prevModifier(avQuery), newAVQuery)];
      }
    }
    return query;
  }

  orWhere<Cmd extends QueryCommand>(
    key: string,
    cmd: Cmd,
    ...values: CommandValuesType<Cmd>
  ): Query<M>;
  orWhere(buncher: QueryBuncher<M>): Query<M>;
  orWhere(key: any, cmd?: any, ...values: any[]) {
    if (this.avQueryCondModifiers.length === 0) {
      // @ts-ignore
      return this.where(...arguments);
    }

    const query = this.clone();
    const prevModifier = _.flow(query.avQueryCondModifiers);
    let newAVQuery: AVQuery;
    if (typeof key === 'string') {
      // @ts-ignore
      const modifier = queryCommands[cmd](key, ...values) as QueryModifier;
      newAVQuery = modifier(query.createEmptyAVQuery());
    } else {
      const newQuery = key(this.createEmptyQuery()) as Query<M>;
      newAVQuery = newQuery.buildAVQuery();
    }
    query.avQueryCondModifiers = [(avQuery) => AV.Query.or(prevModifier(avQuery), newAVQuery)];
    return query;
  }

  whereInOrNotExists(key: string, values: any[]): Query<M> {
    return this.where((query) => {
      return query.where(key, 'in', values).orWhere(key, 'not-exists');
    });
  }

  when<Cond>(
    cond: Cond,
    buncher: (query: Query<M>, cond: NonNullable<Cond>) => Query<M>
  ): Query<M> {
    if (cond) {
      return buncher(this.clone(), cond!);
    }
    return this;
  }

  orderBy(key: string, order?: Order): Query<M>;
  orderBy(orders: [string, Order][]): Query<M>;
  orderBy(key: any, order?: any): Query<M> {
    const query = this.clone();
    if (typeof key === 'string') {
      query.avQueryModifiers.push((query) => {
        return order === 'desc' ? query.descending(key) : query.ascending(key);
      });
    } else {
      query.avQueryModifiers.push((query) => {
        (key as [string, Order][]).forEach(([key, order]) => {
          order === 'desc' ? query.addDescending(key) : query.addAscending(key);
        });
        return query;
      });
    }
    return query;
  }

  skip(count: number): Query<M> {
    const query = this.clone();
    query.avQueryModifiers.push((query) => query.skip(count));
    return query;
  }

  limit(count: number): Query<M> {
    const query = this.clone();
    query.avQueryModifiers.push((query) => query.limit(count));
    return query;
  }

  protected buildAVQuery(): AVQuery {
    let query = new AV.Query<AV.Object>(this.model.className);
    for (const modifier of this.avQueryCondModifiers) {
      query = modifier(query);
    }
    for (const modifier of this.avQueryModifiers) {
      query = modifier(query);
    }
    return query;
  }

  async first(options?: AuthOptions): Promise<InstanceType<M> | undefined> {
    const query = this.buildAVQuery();
    const object = await query.first(options);
    if (object) {
      const item = this.model.fromAVObject(object);
      if (this.resultModifiers.length) {
        const items = [item];
        const objects = [object];
        await Promise.all(this.resultModifiers.map((m) => m(items, objects)));
      }
      return item;
    }
  }

  async get(options?: AuthOptions): Promise<InstanceType<M>[]> {
    const query = this.buildAVQuery();
    const objects = await query.find(options);
    const items = objects.map(this.model.fromAVObject);
    if (this.resultModifiers.length) {
      await Promise.all(this.resultModifiers.map((m) => m(items, objects)));
    }
    return items;
  }

  async getWithTotalCount(options?: AuthOptions): Promise<[InstanceType<M>[], number]> {
    const query = this.buildAVQuery();
    const [objects, totalCount] = await Promise.all([query.find(options), query.count(options)]);
    const items = objects.map(this.model.fromAVObject);
    if (this.resultModifiers.length) {
      await Promise.all(this.resultModifiers.map((m) => m(items, objects)));
    }
    return [items, totalCount];
  }

  modifyQuery(modifier: QueryModifier) {
    const query = this.clone();
    query.avQueryModifiers.push(modifier);
    return query;
  }

  modifyResult(modifier: ResultModifier<InstanceType<M>>) {
    const query = this.clone();
    query.resultModifiers.push(modifier);
    return query;
  }

  getRawParams() {
    return (this.buildAVQuery() as any)._getParams();
  }
}
