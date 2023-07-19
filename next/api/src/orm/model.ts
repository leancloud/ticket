import AV from 'leancloud-storage';
import _ from 'lodash';
import throat from 'throat';
import { Error as LCError } from 'leancloud-storage';

import { config } from '@/config';
import { ACLBuilder, RawACL } from './acl';
import { AuthOptions, Query, QueryBuilder } from './query';
import { KeysOfType } from './utils';
import { Relation } from './relation';
import { preloaderFactory } from './preloader';
import { TypeCommands } from './command';
import { field, serialize } from './helpers';

type RelationKey<T> = Extract<KeysOfType<Required<T>, Model | Model[]>, string>;

export interface ReloadOptions extends AuthOptions {
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

  private static fields: Record<string, Field> = {};

  private static serializedFields: Record<string, SerializedField> = {};

  private static relations: Record<string, Relation> = {};

  private static onDecodeHooks: OnDecodeHook<any>[] = [];

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

  private static inheritObjectProperty(key: string) {
    if (!this.hasOwnProperty(key)) {
      const prototype = Object.getPrototypeOf(this);
      Reflect.set(this, key, { ...prototype[key] });
    }
  }

  static setField(localKey: string, options?: Partial<Omit<Field, 'localKey'>>) {
    this.inheritObjectProperty('fields');
    this.fields[localKey] = {
      localKey,
      avObjectKey: options?.avObjectKey ?? localKey,
      encode: options?.encode ?? _.identity,
      decode: options?.decode ?? _.identity,
    };
  }

  static setSerializedField(key: string, options?: Partial<Omit<SerializedField, 'key'>>) {
    this.inheritObjectProperty('serializedFields');
    this.serializedFields[key] = {
      key,
      encode: options?.encode ?? _.identity,
      decode: options?.decode ?? _.identity,
    };
  }

  static setRelation(relation: Relation) {
    this.inheritObjectProperty('relations');
    this.relations[relation.field] = relation;
  }

  static getRelation(name: string): Relation | undefined {
    return this.relations[name];
  }

  static onDecode<M extends typeof Model>(this: M, hook: OnDecodeHook<M>) {
    if (!this.hasOwnProperty('onDecodeHooks')) {
      this.onDecodeHooks = [];
    }
    this.onDecodeHooks.push(hook);
  }

  private static newInstance<M extends typeof Model>(
    this: M,
    data?: Record<string, any>
  ): InstanceType<M> {
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

    return object;
  }

  static fromJSON<M extends typeof Model>(this: M, data: any): InstanceType<M> {
    const instance = this.newInstance();
    instance.id = data.id;

    Object.entries(this.serializedFields).forEach(([key, { decode }]) => {
      const value = decode(data[key]);
      if (value !== undefined) {
        instance[key as keyof InstanceType<M>] = value;
      }
    });

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

  static async find<M extends typeof Model>(
    this: M,
    id: string,
    options?: AuthOptions
  ): Promise<InstanceType<M> | undefined> {
    return await this.query().where('objectId', '==', id).first(options);
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

    Object.values(model.fields).forEach(({ localKey, avObjectKey, decode }) => {
      if (decode) {
        const value = object.get(avObjectKey);
        if (value === null) {
          fixNullValue(object.className, object.id!, avObjectKey);
          return;
        }
        if (value !== undefined) {
          (this as any)[localKey] = decode(value);
        }
      }
    });

    if (object.createdAt) {
      this.createdAt = object.createdAt;
    }
    if (object.updatedAt) {
      this.updatedAt = object.updatedAt;
    }
    if (model.onDecodeHooks.length) {
      const ctx = { avObject: object, instance: this };
      model.onDecodeHooks.forEach((h) => h(ctx));
    }
  }

  clone<M extends Model>(this: M): M {
    const model = this.constructor as typeof Model;
    const instance = model.newInstance();
    instance.id = this.id;

    Object.values(model.fields).forEach(({ localKey }) => {
      const value = Reflect.get(this, localKey);
      if (value !== undefined) {
        Reflect.set(instance, localKey, value);
      }
    });

    instance.createdAt = this.createdAt;
    instance.updatedAt = this.updatedAt;
    return instance as M;
  }

  reload<M extends Model, K extends RelationKey<M>>(
    this: M,
    key: K,
    options?: ReloadOptions
  ): Promise<M[K]> {
    if (!this.reloadTasks[key]) {
      this.reloadTasks[key] = (async () => {
        try {
          const preloader = preloaderFactory(this.constructor as any, key);
          if (options) {
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
    options?: ReloadOptions
  ): Promise<M[K]> {
    if (this[key] !== undefined) {
      return Promise.resolve(this[key]);
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
    const avObject = this.newAVObject(data);
    await saveAVObject(avObject, options);
    const instance = this.newInstance(data);
    instance.applyAVObject(avObject);

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

    const objects = datas.map((data) => this.newAVObject(data));
    await saveAVObjects(objects, options);
    const instances = objects.map((object, i) => {
      const data = datas[i];
      const instance = this.newInstance(data);
      instance.applyAVObject(object);
      return instance;
    });

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

    const objects = pairs.map((pair) => this.newAVObject(pair[1], pair[0].id));
    await saveAVObjects(objects, options);

    const instances = objects.map((object, i) => {
      const [preInstance, data] = pairs[i];
      const instance = preInstance.clone();
      instance.applyAVObject(object);
      Object.entries(data)
        .filter(([, value]) => value === null)
        .forEach(([key]) => Reflect.deleteProperty(instance, key));
      return instance;
    });

    return instances;
  }

  async update<M extends Model>(this: M, data: UpdateData<M>, options?: ModifyOptions): Promise<M> {
    const model = this.constructor as typeof Model;

    const object = model.newAVObject(data, this.id);
    await saveAVObject(object, options);

    const instance = this.clone();
    instance.applyAVObject(object);

    Object.entries(data)
      .filter(([, value]) => value === null)
      .forEach(([key]) => Reflect.deleteProperty(instance, key));

    return instance;
  }

  static async upsert<M extends typeof Model>(
    this: M,
    data: CreateData<M>,
    queryModifier: (query: Query<M>) => any,
    updateData: UpdateData<InstanceType<M>>,
    options: ModifyOptions = {}
  ) {
    try {
      return await this.create(data, options);
    } catch (error) {
      if (error instanceof Error) {
        if (((error as any) as LCError).code === LCError.DUPLICATE_VALUE) {
          const queryBuilder = this.queryBuilder();
          queryModifier(queryBuilder);
          const object = await queryBuilder.first({ useMasterKey: true });
          if (!object) {
            throw new Error('Deplucated value detected but no matched object.');
          }
          return await object.update(updateData, options);
        }
      }
      throw error;
    }
  }

  async delete(options: ModifyOptions = {}) {
    const object = AV.Object.createWithoutData(this.className, this.id);
    applyIgnoreHookOptions(object, options);
    await object.destroy(getAuthOptions(options));
  }

  static async deleteSome(ids: string[], options?: AuthOptions) {
    if (ids.length === 0) {
      return;
    }
    const objects = ids.map((id) => AV.Object.createWithoutData(this.getClassName(), id));
    await AV.Object.destroyAll(objects, options);
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

    Object.entries(model.serializedFields).forEach(([key, { encode }]) => {
      const value = encode(this[key as keyof this]);
      if (value !== undefined) {
        data[key] = value;
      }
    });

    return data;
  }
}

export abstract class AliasModel extends Model {
  @field()
  @serialize()
  alias?: string;

  @field()
  @serialize()
  aliases?: string[];

  static async find<M extends typeof AliasModel>(
    this: M,
    id: string,
    options?: AuthOptions
  ): Promise<InstanceType<M> | undefined> {
    const idMatch = await this.query().where('objectId', '==', id).first(options);
    if (idMatch) {
      return idMatch;
    }
    const aliasMatch = await this.query().where('alias', '==', id).first(options);
    if (aliasMatch) {
      return aliasMatch;
    }
    return await this.query().where('aliases', '==', id).first(options);
  }
}

const runFixNullValue = throat(1);
function fixNullValue(className: string, id: string, key: string) {
  if (!config.fixNullValue) {
    return;
  }
  const task = async () => {
    const obj = AV.Object.createWithoutData(className, id);
    obj.unset(key);
    obj.disableBeforeHook();
    obj.disableAfterHook();
    await obj.save(null, { useMasterKey: true });
    console.log(`[INFO] [Null value fixer] Unset ${className}(${id}).${key}`);
  };
  runFixNullValue(task);
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
