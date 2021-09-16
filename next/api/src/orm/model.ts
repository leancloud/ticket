import AV from 'leancloud-storage';
import _ from 'lodash';

import { AuthOptions, Query, QueryBuilder } from './query';
import { Flat, KeysOfType } from './utils';
import { Relation } from './relation';
import { preloaderFactory } from './preloader';

type RelationKey<T> = Extract<KeysOfType<T, Model | Model[] | undefined>, string>;

export interface ReloadOptions<M extends Model, K extends RelationKey<M> = RelationKey<M>> {
  data?: Flat<NonNullable<M[K][]>>;
  authOptions?: AuthOptions;
}

export type FieldEncoder = (data: any) => any;

export type FieldDecoder = (data: any) => any;

export type OnDecodeField = (instance: any, object: AV.Object) => void;

export type OnEncodeField = (instance: any, object: AV.Object) => void;

export interface Field {
  localKey: string;
  avObjectKey: string;
  encode: FieldEncoder | false;
  decode: FieldDecoder | false;
  onEncode?: OnEncodeField;
  onDecode?: OnDecodeField;
}

export type SerializedFieldEncoder = (data: any) => any;

export type SerializedFieldDecoder = (data: any) => any;

export interface SerializedField {
  key: string;
  encode: SerializedFieldEncoder;
  decode: SerializedFieldDecoder;
}

export interface BeforeCreateContext<M extends typeof Model> {
  avObject: AV.Object;
  data: CreateData<M>;
}

export type BeforeCreateHook<M extends typeof Model> = (
  context: BeforeCreateContext<M>
) => void | Promise<void>;

export interface AfterCreateContext<M extends typeof Model> {
  instance: InstanceType<M>;
}

export type AfterCreateHook<M extends typeof Model> = (context: AfterCreateContext<M>) => void;

type _CreateData<T> = Partial<
  Omit<T, 'id' | 'createdAt' | 'updatedAt' | KeysOfType<T, Function | Model | Model[]>>
>;

export type CreateData<M extends typeof Model | Model> = M extends typeof Model
  ? _CreateData<InstanceType<M>>
  : _CreateData<M>;

type _UpdateData<T> = {
  [K in keyof _CreateData<T>]?: T[K] | null;
};

export type UpdateData<M extends typeof Model | Model> = M extends typeof Model
  ? _UpdateData<InstanceType<M>>
  : _UpdateData<M>;

export type InstanceData<M extends typeof Model> = Partial<
  Omit<InstanceType<M>, KeysOfType<InstanceType<M>, Function>>
>;

export interface SaveAVObjectOptions extends AuthOptions {
  ignoreBeforeHooks?: boolean;
  ignoreAfterHooks?: boolean;
  fetchWhenSave?: boolean;
}

export type RawACL = Record<string, { read?: true; write?: true }>;

export abstract class Model {
  static readonly className: string;

  static readonly avObjectConstructor = AV.Object;

  private static fields: Record<string, Field>;

  private static serializedFields: Record<string, SerializedField>;

  private static relations: Record<string, Relation>;

  private static beforeCreateHooks: BeforeCreateHook<any>[];

  private static afterCreateHooks: AfterCreateHook<any>[];

  id!: string;

  ACL?: RawACL;

  createdAt!: Date;

  updatedAt!: Date;

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

  static beforeCreate<M extends typeof Model>(this: M, hook: BeforeCreateHook<M>) {
    this.beforeCreateHooks ??= [];
    this.beforeCreateHooks.push(hook);
  }

  static afterCreate<M extends typeof Model>(this: M, hook: AfterCreateHook<M>) {
    this.afterCreateHooks ??= [];
    this.afterCreateHooks.push(hook);
  }

  static newInstance<M extends typeof Model>(this: M, data?: InstanceData<M>): InstanceType<M> {
    // @ts-ignore
    const instance = new this();
    if (data) {
      Object.entries(data).forEach(([key, value]) => (instance[key] = value));
    }
    return instance;
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
    const instance = this.newInstance();
    instance.id = object.id!;
    if (this.fields) {
      Object.entries(this.fields).forEach(([key, { avObjectKey, decode, onDecode }]) => {
        if (decode) {
          const value = object.get(avObjectKey);
          if (value !== undefined) {
            const decodedValue = decode(value);
            if (decodedValue !== undefined) {
              instance[key as keyof InstanceType<M>] = decodedValue;
            }
          }
        }
        onDecode?.(instance, object);
      });
    }
    instance.createdAt = object.createdAt!;
    instance.updatedAt = object.updatedAt!;
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

  async reload<M extends Model, K extends RelationKey<M>>(
    this: M,
    key: K,
    options?: ReloadOptions<M, K>
  ): Promise<M[K]> {
    const preloader = preloaderFactory(this.constructor as any, key);
    if (options?.data) {
      preloader.data = options.data;
    }
    await preloader.load([this], options?.authOptions);
    return this[key as keyof M] as M[K];
  }

  load<M extends Model, K extends RelationKey<M>>(
    this: M,
    key: K,
    options?: ReloadOptions<M, K>
  ): Promise<M[K]> {
    if (this[key as keyof M] !== undefined) {
      return this[key as keyof M] as M[K];
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
    options?: Omit<SaveAVObjectOptions, 'fetchWhenSave'>
  ): Promise<InstanceType<M>> {
    let instance = this.newInstance(data);
    const avObject = instance.toAVObject();

    if (this.beforeCreateHooks) {
      const ctx = { avObject, data };
      await Promise.all(this.beforeCreateHooks.map((hook) => hook(ctx)));
    }

    if (options?.ignoreBeforeHooks) {
      avObject.disableBeforeHook();
    }
    if (options?.ignoreAfterHooks) {
      avObject.disableAfterHook();
    }
    await avObject.save(null, { ...options, fetchWhenSave: true });
    instance = this.fromAVObject(avObject);

    if (this.afterCreateHooks) {
      const ctx = { instance };
      this.afterCreateHooks.forEach((hook) => {
        try {
          hook(ctx);
        } catch {}
      });
    }

    return instance;
  }

  static async createSome<M extends typeof Model>(
    this: M,
    datas: CreateData<M>[],
    options?: Omit<SaveAVObjectOptions, 'fetchWhenSave'>
  ): Promise<InstanceType<M>[]> {
    if (datas.length === 0) {
      return [];
    }
    if (datas.length === 1) {
      return [await this.create(datas[0], options)];
    }

    let instances = datas.map((data) => this.newInstance(data));
    const avObjects = instances.map((instance) => instance.toAVObject());

    if (this.beforeCreateHooks) {
      const tasks = avObjects.map((avObject, i) => {
        const ctx = { avObject, data: datas[i] };
        return Promise.all(this.beforeCreateHooks.map((hook) => hook(ctx)));
      });
      await Promise.all(tasks);
    }

    if (options?.ignoreBeforeHooks) {
      avObjects.forEach((o) => o.disableBeforeHook());
    }
    if (options?.ignoreAfterHooks) {
      avObjects.forEach((o) => o.disableAfterHook());
    }
    await AV.Object.saveAll(avObjects, { ...options, fetchWhenSave: true });
    instances = avObjects.map((o) => this.fromAVObject(o));

    if (this.afterCreateHooks) {
      instances.forEach((instance) => {
        const ctx = { instance };
        this.afterCreateHooks.forEach((hook) => {
          try {
            hook(ctx);
          } catch {}
        });
      });
    }

    return instances;
  }

  async update<M extends Model>(
    this: M,
    data: UpdateData<M>,
    options?: Omit<SaveAVObjectOptions, 'fetchWhenSave'>
  ): Promise<M> {
    const model = this.constructor as typeof Model;
    const instance = model.newInstance(data) as M;
    instance.id = this.id;
    const avObject = instance.toAVObject();

    await avObject.save(null, { ...options, fetchWhenSave: true });
    const newInstance = model.fromAVObject(avObject) as M;
    Object.values(model.fields).forEach(({ localKey }) => {
      // @ts-ignore
      const value = instance[localKey] ?? this[localKey] ?? undefined;
      if (value !== undefined) {
        // @ts-ignore
        newInstance[localKey] ??= value;
      }
    });
    newInstance.createdAt = this.createdAt;

    return newInstance;
  }

  async delete(options?: AuthOptions) {
    const avObject = AV.Object.createWithoutData(this.className, this.id);
    await avObject.destroy(options);
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

  toAVObject(): AV.Object {
    const model = this.constructor as typeof Model;
    const className = model.getClassName();
    const AVObject = model.avObjectConstructor;

    const avObject = this.id
      ? AVObject.createWithoutData(className, this.id)
      : new AVObject(className);

    if (this.ACL) {
      avObject.set('ACL', this.ACL);
    }

    Object.values(model.fields).forEach(({ localKey, avObjectKey, encode, onEncode }) => {
      if (encode) {
        const value = this[localKey as keyof this];
        if (value !== undefined) {
          if (value === null) {
            avObject.unset(avObjectKey);
          } else {
            const encodedValue = encode(value);
            if (encodedValue !== undefined) {
              avObject.set(avObjectKey, encodedValue);
            }
          }
        }
      }
      onEncode?.(this, avObject);
    });
    return avObject;
  }
}
