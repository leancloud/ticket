import AV from 'leancloud-storage';
import _ from 'lodash';

import { ACLBuilder, RawACL } from './acl';
import { AuthOptions, Query, QueryBuilder } from './query';
import { Flat, KeysOfType } from './utils';
import { Relation } from './relation';
import { preloaderFactory } from './preloader';
import { TypeCommands } from './command';

type RelationKey<T> = Extract<KeysOfType<T, Model | Model[] | undefined>, string>;

export interface ReloadOptions<M extends Model, K extends RelationKey<M> = RelationKey<M>>
  extends AuthOptions {
  data?: Flat<NonNullable<M[K][]>>;
  onQuery?: (query: QueryBuilder<any>) => void;
}

export interface Field {
  localKey: string;
  avObjectKey: string;
  encode: ((data: any) => any) | false;
  decode: ((data: any) => any) | false;
}

export interface SerializedField {
  key: string;
  encode: (data: any) => any;
  decode: (data: any) => any;
}

export interface OnDecodeContext<M extends typeof Model> {
  avObject: AV.Object;
  instance: InstanceType<M>;
}

export type OnDecodeHook<M extends typeof Model> = (ctx: OnDecodeContext<M>) => void;

export interface BeforeCreateContext<M extends typeof Model> {
  data: CreateData<M>;
  options: ModifyOptions;
}

export type BeforeCreateHook<M extends typeof Model> = (
  context: BeforeCreateContext<M>
) => void | Promise<void>;

export interface AfterCreateContext<M extends typeof Model> {
  instance: InstanceType<M>;
  data: CreateData<M>;
  options: ModifyOptions;
}

export type AfterCreateHook<M extends typeof Model> = (context: AfterCreateContext<M>) => void;

export interface BeforeUpdateContext<M extends typeof Model> {
  instance: InstanceType<M>;
  data: UpdateData<M>;
  options: ModifyOptions;
}

export type BeforeUpdateHook<M extends typeof Model> = (
  ctx: BeforeUpdateContext<M>
) => void | Promise<void>;

export interface AfterUpdateContext<M extends typeof Model> extends BeforeUpdateContext<M> {}

export type AfterUpdateHook<M extends typeof Model> = (ctx: AfterUpdateContext<M>) => void;

type _CreateData<T> = Partial<
  Omit<T, 'id' | 'createdAt' | 'updatedAt' | KeysOfType<T, Function | Model | Model[]>>
>;

export type CreateData<M extends typeof Model | Model> = M extends typeof Model
  ? _CreateData<InstanceType<M>>
  : _CreateData<M>;

type _UpdateData<T> = {
  [K in keyof _CreateData<T>]?: T[K] | null | TypeCommands<T[K]>;
};

export type UpdateData<M extends typeof Model | Model> = M extends typeof Model
  ? _UpdateData<InstanceType<M>>
  : _UpdateData<M>;

export type InstanceData<M extends typeof Model> = Partial<
  Omit<InstanceType<M>, KeysOfType<InstanceType<M>, Function>>
>;

interface IgnoreHookOptions {
  ignoreBeforeHook?: boolean;
  ignoreAfterHook?: boolean;
}

export interface ModifyOptions extends IgnoreHookOptions, AuthOptions {}

export type AVObjectFactory = (className: string, objectId?: string) => AV.Object;

export abstract class Model {
  protected static className: string;

  protected static avObjectFactory: AVObjectFactory = (className, id) => {
    return id ? AV.Object.createWithoutData(className, id) : new AV.Object(className);
  };

  private static fields: Record<string, Field>;

  private static serializedFields: Record<string, SerializedField>;

  private static relations: Record<string, Relation>;

  private static onDecodeHooks: OnDecodeHook<any>[];

  private static beforeCreateHooks: BeforeCreateHook<any>[];

  private static afterCreateHooks: AfterCreateHook<any>[];

  private static beforeUpdateHooks: BeforeUpdateHook<any>[];

  private static afterUpdateHooks: AfterUpdateHook<any>[];

  id!: string;

  ACL?: RawACL | ACLBuilder;

  createdAt!: Date;

  updatedAt!: Date;

  private reloadTasks: Record<string, Promise<any>> = {};

  get className() {
    return (this.constructor as typeof Model).getClassName();
  }

  static getClassName(): string {
    return this.className ?? this.name;
  }

  static setField(field: Field) {
    this.fields ??= {};
    this.fields[field.localKey] = field;
  }

  static setSerializedField(name: string, field: SerializedField) {
    this.serializedFields ??= {};
    this.serializedFields[name] = field;
  }

  static setRelation(relation: Relation) {
    this.relations ??= {};
    this.relations[relation.name] = relation;
  }

  static getRelation(name: string): Relation | undefined {
    return this.relations?.[name];
  }

  static onDecode<M extends typeof Model>(this: M, hook: OnDecodeHook<M>) {
    this.onDecodeHooks ??= [];
    this.onDecodeHooks.push(hook);
  }

  static beforeCreate<M extends typeof Model>(this: M, hook: BeforeCreateHook<M>) {
    this.beforeCreateHooks ??= [];
    this.beforeCreateHooks.push(hook);
  }

  static afterCreate<M extends typeof Model>(this: M, hook: AfterCreateHook<M>) {
    this.afterCreateHooks ??= [];
    this.afterCreateHooks.push(hook);
  }

  static beforeUpdate<M extends typeof Model>(this: M, hook: BeforeUpdateHook<M>) {
    this.beforeUpdateHooks ??= [];
    this.beforeUpdateHooks.push(hook);
  }

  static afterUpdate<M extends typeof Model>(this: M, hook: AfterUpdateHook<M>) {
    this.afterUpdateHooks ??= [];
    this.afterUpdateHooks.push(hook);
  }

  static newInstance<M extends typeof Model>(this: M, data?: InstanceData<M>): InstanceType<M> {
    // @ts-ignore
    const instance = new this();
    if (data) {
      Object.entries(data).forEach(([key, value]) => (instance[key] = value));
    }
    return instance;
  }

  private static newAVObject<M extends typeof Model>(
    this: M,
    data: UpdateData<M>,
    id?: string
  ): AV.Object {
    const object = this.avObjectFactory(this.getClassName(), id);
    if (data.ACL) {
      if (data.ACL instanceof ACLBuilder) {
        object.set('ACL', data.ACL.toJSON());
      } else {
        object.set('ACL', data.ACL);
      }
    }
    if (this.fields) {
      Object.values(this.fields).forEach(({ localKey, avObjectKey, encode }) => {
        if (!encode) {
          return;
        }
        const value = (data as any)[localKey];
        if (value === undefined) {
          return;
        }
        if (value === null) {
          if (object.id) {
            object.unset(avObjectKey);
          }
          return;
        }
        if (value.__op) {
          if (object.id) {
            object.set(avObjectKey, value);
          }
          return;
        }
        const encodedValue = encode(value);
        if (encodedValue !== undefined) {
          object.set(avObjectKey, encodedValue);
        }
      });
    }
    return object;
  }

  static fromJSON<M extends typeof Model>(this: M, data: any): InstanceType<M> {
    const instance = this.newInstance();
    instance.id = data.id;
    if (this.serializedFields) {
      Object.entries(this.serializedFields).forEach(([key, { decode }]) => {
        const value = decode(data[key]);
        if (value !== undefined) {
          instance[key as keyof InstanceType<M>] = value;
        }
      });
    }
    instance.createdAt = new Date(data.createdAt);
    instance.updatedAt = new Date(data.updatedAt);
    return instance;
  }

  static fromAVObject<M extends typeof Model>(this: M, object: AV.Object): InstanceType<M> {
    if (!object.id) {
      throw new Error('Cannot construct instance from an unsaved AVObject');
    }
    const instance = this.newInstance();
    instance.applyAVObject(object);
    return instance;
  }

  static query<M extends typeof Model>(this: M): Query<M> {
    return new Query(this);
  }

  static queryBuilder<M extends typeof Model>(this: M): Query<M> {
    return new QueryBuilder(this);
  }

  static find<M extends typeof Model>(
    this: M,
    id: string,
    options?: AuthOptions
  ): Promise<InstanceType<M> | undefined> {
    return this.query().where('objectId', '==', id).first(options);
  }

  static async findOrFail<M extends typeof Model>(
    this: M,
    id: string,
    options?: AuthOptions
  ): Promise<InstanceType<M>> {
    const query = new AV.Query<AV.Object>(this.getClassName());
    const object = await query.get(id, options);
    return this.fromAVObject(object);
  }

  private applyAVObject(object: AV.Object) {
    const model = this.constructor as typeof Model;
    if (object.id) {
      this.id = object.id;
    }
    if (model.fields) {
      Object.values(model.fields).forEach(({ localKey, avObjectKey, decode }) => {
        if (decode) {
          const value = object.get(avObjectKey);
          if (value !== undefined) {
            (this as any)[localKey] = decode(value);
          }
        }
      });
    }
    if (object.createdAt) {
      this.createdAt = object.createdAt;
    }
    if (object.updatedAt) {
      this.updatedAt = object.updatedAt;
    }
    if (model.onDecodeHooks) {
      const ctx = { avObject: object, instance: this };
      model.onDecodeHooks.forEach((h) => h(ctx));
    }
  }

  reload<M extends Model, K extends RelationKey<M>>(
    this: M,
    key: K,
    options?: ReloadOptions<M, K>
  ): Promise<M[K]> {
    if (!this.reloadTasks[key]) {
      this.reloadTasks[key] = (async () => {
        try {
          const preloader = preloaderFactory(this.constructor as any, key);
          if (options) {
            preloader.data = options.data;
            preloader.queryModifier = options.onQuery;
          }
          await preloader.load([this], options);
          return this[key];
        } finally {
          delete this.reloadTasks[key];
        }
      })();
    }
    return this.reloadTasks[key];
  }

  load<M extends Model, K extends RelationKey<M>>(
    this: M,
    key: K,
    options?: ReloadOptions<M, K>
  ): Promise<M[K]> {
    if (this[key] !== undefined) {
      return this[key];
    }
    return this.reload(key, options);
  }

  static ptr(objectId: string) {
    return {
      __type: 'Pointer',
      className: this.getClassName(),
      objectId,
    };
  }

  static async create<M extends typeof Model>(
    this: M,
    data: CreateData<M>,
    options?: ModifyOptions
  ): Promise<InstanceType<M>> {
    data = { ...data };
    options = { ...options };

    if (this.beforeCreateHooks) {
      const ctx = { data, options };
      await Promise.all(this.beforeCreateHooks.map((h) => h(ctx)));
    }

    const avObject = this.newAVObject(data);
    await saveAVObject(avObject, options);
    const instance = this.newInstance(data);
    instance.applyAVObject(avObject);

    if (this.afterCreateHooks) {
      const ctx = { instance, data, options };
      this.afterCreateHooks.forEach((h) => {
        try {
          h(ctx);
        } catch {}
      });
    }

    return instance;
  }

  static async createSome<M extends typeof Model>(
    this: M,
    datas: CreateData<M>[],
    options?: ModifyOptions
  ): Promise<InstanceType<M>[]> {
    if (datas.length === 0) {
      return [];
    }
    if (datas.length === 1) {
      return [await this.create(datas[0], options)];
    }

    datas = datas.map((data) => ({ ...data }));
    options = { ...options };

    if (this.beforeCreateHooks) {
      await Promise.all(
        datas.map((data) => {
          const ctx = { data, options: options! };
          return Promise.all(this.beforeCreateHooks.map((h) => h(ctx)));
        })
      );
    }

    const objects = datas.map((data) => this.newAVObject(data));
    await saveAVObjects(objects, options);
    const instances = objects.map((object, i) => {
      const data = datas[i];
      const instance = this.newInstance(data);
      instance.applyAVObject(object);
      return instance;
    });

    if (this.afterCreateHooks) {
      instances.forEach((instance, i) => {
        const ctx = { instance, data: datas[i], options: options! };
        this.afterCreateHooks.forEach((h) => {
          try {
            h(ctx);
          } catch {}
        });
      });
    }

    return instances;
  }

  static async updateSome<M extends typeof Model>(
    this: M,
    pairs: [InstanceType<M>, UpdateData<M>][],
    options?: ModifyOptions
  ): Promise<InstanceType<M>[]> {
    if (pairs.length === 0) {
      return [];
    }
    if (pairs.length === 1) {
      const [instance, data] = pairs[0];
      return [await instance.update(data as any, options)];
    }

    const datas = pairs.map(([, data]) => ({ ...data }));
    options = { ...options };

    if (this.beforeUpdateHooks) {
      await Promise.all(
        datas.map((data, i) => {
          const ctx = { instance: pairs[i][0], data, options: options! };
          return Promise.all(this.beforeUpdateHooks.map((h) => h(ctx)));
        })
      );
    }

    const objects = datas.map((data, i) => this.newAVObject(data, pairs[i][0].id));
    await saveAVObjects(objects, options);

    const instances = objects.map((object, i) => {
      const data = datas[i];
      const instance = this.newInstance(_.omitBy(data as any, _.isNull));
      instance.applyAVObject(object);
      const preInstance = pairs[i][0];
      Object.getOwnPropertyNames(preInstance).forEach((name) => {
        (instance as any)[name] ??= (preInstance as any)[name];
      });
      return instance;
    });

    if (this.afterCreateHooks) {
      instances.forEach((instance, i) => {
        const ctx = { instance, data: datas[i], options: options! };
        this.afterCreateHooks.forEach((h) => {
          try {
            h(ctx);
          } catch {}
        });
      });
    }

    return instances;
  }

  async update<M extends Model>(this: M, data: UpdateData<M>, options?: ModifyOptions): Promise<M> {
    data = { ...data };
    options = { ...options };

    const model = this.constructor as typeof Model;

    if (model.beforeUpdateHooks) {
      const ctx = { instance: this, data, options: options! };
      await Promise.all(model.beforeUpdateHooks.map((h) => h(ctx)));
    }

    const object = model.newAVObject(data, this.id);
    await saveAVObject(object, options);

    const instance = model.newInstance(_.omitBy(data, _.isNull));
    instance.applyAVObject(object);
    Object.getOwnPropertyNames(this).forEach((name) => {
      (instance as any)[name] ??= (this as any)[name];
    });

    if (model.afterUpdateHooks) {
      const ctx = { instance, data, options };
      model.afterUpdateHooks.forEach((hook) => {
        try {
          hook(ctx);
        } catch {}
      });
    }

    return instance as M;
  }

  async delete(options: ModifyOptions = {}) {
    const object = AV.Object.createWithoutData(this.className, this.id);
    applyIgnoreHookOptions(object, options);
    await object.destroy(getAuthOptions(options));
  }

  toPointer() {
    const model = this.constructor as typeof Model;
    return model.ptr(this.id);
  }

  toJSON(): any {
    const data: any = {
      id: this.id,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };

    const model = this.constructor as typeof Model;
    if (model.serializedFields) {
      Object.entries(model.serializedFields).forEach(([key, { encode }]) => {
        const value = encode(this[key as keyof this]);
        if (value !== undefined) {
          data[key] = value;
        }
      });
    }

    return data;
  }
}

function getAuthOptions(options: ModifyOptions): AuthOptions {
  return _.pick(options, ['useMasterKey', 'sessionToken']);
}

function applyIgnoreHookOptions(object: AV.Object, options: IgnoreHookOptions) {
  if (options.ignoreBeforeHook) {
    object.disableBeforeHook();
  }
  if (options.ignoreAfterHook) {
    object.disableAfterHook();
  }
}

function saveAVObject(object: AV.Object, options: ModifyOptions = {}) {
  applyIgnoreHookOptions(object, options);
  return object.save(null, { ...getAuthOptions(options), fetchWhenSave: true });
}

function saveAVObjects(objects: AV.Object[], options: ModifyOptions = {}) {
  objects.forEach((object) => applyIgnoreHookOptions(object, options));
  return AV.Object.saveAll(objects, { ...getAuthOptions(options), fetchWhenSave: true });
}
