import AV from 'leancloud-storage';
import _ from 'lodash';

interface ModelFactory<T> {
  fromAVObject: (obj: AV.Object) => T;
}

type Method =
  | 'equalTo'
  | 'notEqualTo'
  | 'exists'
  | 'doesNotExist'
  | 'lessThan'
  | 'lessThanOrEqualTo'
  | 'greaterThan'
  | 'greaterThanOrEqualTo'
  | 'startsWith'
  | 'endsWith'
  | 'contains'
  | 'containedIn'
  | 'notContainedIn';

type Condition<T> =
  | {
      method: keyof Pick<AV.Query<AV.Object>, Method>; // 确保是 av.query 的方法
      field: keyof T;
      value?: string | number | boolean | Date;
    }
  | {
      method: keyof Pick<AV.Query<AV.Object>, Method>; // 确保是 av.query 的方法
      field: string;
      value: AV.Object | AV.Object[] | Array<number | string>;
    };

interface Sort<T extends {}> {
  key: keyof T;
  order?: 'asc' | 'desc'; // default 'desc'
}

interface Limitation {
  skip?: number;
  limit?: number;
}
const defaultLimitation: Limitation = {
  skip: 0,
  limit: 100,
};
class BasicService<T extends { id: string }> {
  public className: string;
  public authOptions: AV.AuthOptions;
  public factory: ModelFactory<T>;
  constructor(className: string, factory: ModelFactory<T>, options?: AV.AuthOptions) {
    this.className = className;
    this.factory = factory;
    this.authOptions = options || {
      useMasterKey: true,
    };
  }

  creatQuery(limitation?: Limitation, conditions?: Condition<T>[], sort?: Sort<T>[]) {
    let query = new AV.Query<AV.Object>(this.className);
    if (limitation) {
      _.isNumber(limitation.limit) && query.limit(limitation.limit);
      _.isNumber(limitation.skip) && query.skip(limitation.skip);
    }
    if (conditions && conditions.length > 0) {
      conditions.forEach(({ field, value, method }) => {
        query[method](field as string, value);
      });
    }
    if (sort) {
      sort.forEach(({ key, order }) => {
        if (typeof key !== 'string') {
          return;
        }
        query[!order || order === 'asc' ? 'addAscending' : 'addDescending'](key);
      });
    }
    return query;
  }

  async find(conditions?: Condition<T>[], limitation = defaultLimitation, sort?: Sort<T>[]) {
    const query = this.creatQuery(limitation, conditions, sort);
    const objects = await query.find(this.authOptions);
    return objects.map((obj) => this.factory.fromAVObject(obj));
  }

  async findWithCount(
    limitation = defaultLimitation,
    conditions?: Condition<T>[],
    sort?: Sort<T>[]
  ) {
    const query = this.creatQuery(limitation, conditions, sort);
    const objects = await query.find(this.authOptions);
    const count = await query.count(this.authOptions);
    return {
      list: objects.map((obj) => this.factory.fromAVObject(obj)),
      count: count,
    };
  }

  async get(id: string) {
    const result = await new AV.Query<AV.Object>(this.className).get(id, this.authOptions);
    return this.factory.fromAVObject(result);
  }

  async update(id: string, data: Partial<T>) {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return { id };
    }
    const obj = this.toAVObject(id);
    keys.forEach((key) => {
      obj.set(key, data[key as keyof T]);
    });
    const result = await obj.save(null, this.authOptions);
    const { objectId, ...rest } = result.toJSON();
    return {
      id: objectId,
      ...rest,
    } as Partial<T>;
  }

  async save(data: Partial<Omit<T, 'id'>>) {
    const obj = new AV.Object(this.className);
    const result = await obj.save(
      {
        ACL: {},
        ...data,
      },
      this.authOptions
    );
    return this.factory.fromAVObject(result);
  }

  async saveList(list: Partial<Omit<T, 'id'>>[]) {
    const objects = list.map(
      (data) =>
        new AV.Object(this.className, {
          ACL: {},
          ...data,
        })
    );
    const result = await AV.Object.saveAll(objects, this.authOptions);
    return result
      .filter((obj) => obj instanceof AV.Object)
      .map((obj) => this.factory.fromAVObject(obj as AV.Object));
  }

  async delete(id: string) {
    await this.toAVObject(id).destroy(this.authOptions);
    return {
      id,
    };
  }

  async deleteBy(conditions: Condition<T>[]) {
    const results = await this.creatQuery(undefined, conditions).find(this.authOptions);
    await AV.Object.destroyAll(results, this.authOptions);
    return {};
  }

  toAVObject(id: string) {
    return AV.Object.createWithoutData(this.className, id);
  }
}

export default BasicService;
