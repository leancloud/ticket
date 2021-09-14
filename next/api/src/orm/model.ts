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

export interface BeforeCreateContext {
  avObject: AV.Object;
}

export type BeforeCreateHook = (context: BeforeCreateContext) => void | Promise<void>;

export interface AfterCreateContext<M extends typeof Model> {
  instance: InstanceType<M>;
}

export type AfterCreateHook<M extends typeof Model> = (context: AfterCreateContext<M>) => void;

export type CreateData<T> = Partial<
  Omit<T, 'id' | 'createdAt' | 'updatedAt' | KeysOfType<T, Function | Model | Model[]>>
>;

export type UpdateData<T> = {
  [K in keyof CreateData<T>]?: T[K] | null;
};

export interface SaveAVObjectOptions extends AuthOptions {
  ignoreBeforeHooks?: boolean;
  ignoreAfterHooks?: boolean;
  fetchWhenSave?: boolean;
}

export abstract class Model {
  static readonly className: string;

  static readonly avObjectConstructor = AV.Object;

  private static fields: Record<string, Field>;

  private static serializedFields: Record<string, SerializedField>;

  private static relations: Record<string, Relation>;

  private static beforeCreateHooks: BeforeCreateHook[];

  private static afterCreateHooks: AfterCreateHook<any>[];

  readonly id!: string;

  readonly ACL?: Record<string, { read?: true; write?: true }>;

  readonly createdAt!: Date;

  readonly updatedAt!: Date;

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

  static beforeCreate(hook: BeforeCreateHook) {
    this.beforeCreateHooks ??= [];
    this.beforeCreateHooks.push(hook);
  }

  static afterCreate<M extends typeof Model>(this: M, hook: AfterCreateHook<M>) {
    this.afterCreateHooks ??= [];
    this.afterCreateHooks.push(hook);
  }

  static fromJSON<M extends typeof Model>(this: M, data: any): InstanceType<M> {
    // @ts-ignore
    const instance = new this();
    instance.id = data.id;
    if (this.serializedFields) {
      Object.entries(this.serializedFields).forEach(([key, { decode }]) => {
        const value = decode(data[key]);
        if (value !== undefined) {
          instance[key] = value;
        }
      });
    }
    instance.createdAt = new Date(data.createdAt);
    instance.updatedAt = new Date(data.updatedAt);
    return instance;
  }

  static fromAVObject<M extends typeof Model>(this: M, object: AV.Object): InstanceType<M> {
    // @ts-ignore
    const instance = new this();
    instance.id = object.id;
    if (this.fields) {
      Object.entries(this.fields).forEach(([key, { avObjectKey, decode, onDecode }]) => {
        if (decode) {
          const value = object.get(avObjectKey);
          if (value !== undefined) {
            const decodedValue = decode(value);
            if (decodedValue !== undefined) {
              instance[key] = decodedValue;
            }
          }
        }
        onDecode?.(instance, object);
      });
    }
    instance.createdAt = object.createdAt;
    instance.updatedAt = object.updatedAt ?? object.createdAt;
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
    data: CreateData<InstanceType<M>>,
    options?: Omit<SaveAVObjectOptions, 'fetchWhenSave'>
  ): Promise<InstanceType<M>> {
    // @ts-ignore
    let instance = new this() as InstanceType<M>;
    Object.entries(data).forEach(([key, value]) => {
      // @ts-ignore
      instance[key] = value;
    });

    const avObject = instance.toAVObject();

    if (this.beforeCreateHooks) {
      const ctx = { avObject };
      await Promise.all(this.beforeCreateHooks.map((hook) => hook(ctx)));
    }

    await saveAVObject(avObject, { ...options, fetchWhenSave: true });
    instance = this.fromAVObject(avObject);

    if (this.afterCreateHooks) {
      const ctx = { instance };
      try {
        this.afterCreateHooks.forEach((hook) => hook(ctx));
      } catch {} // ignore error
    }

    return instance;
  }

  async update<M extends Model>(
    this: M,
    data: UpdateData<M>,
    options?: Omit<SaveAVObjectOptions, 'fetchWhenSave'>
  ): Promise<M> {
    const model = this.constructor as typeof Model;
    // @ts-ignore
    let instance = new model() as M;
    // @ts-ignore
    instance.id = this.id;
    // @ts-ignore
    Object.entries(data).forEach(([key, value]) => (instance[key] = value));

    const avObject = instance.toAVObject();

    await saveAVObject(avObject, { ...options, fetchWhenSave: true });

    const newInstance = model.fromAVObject(avObject) as M;
    Object.values(model.fields).forEach(({ localKey }) => {
      // @ts-ignore
      const value = instance[localKey] ?? this[localKey] ?? undefined;
      if (value !== undefined) {
        // @ts-ignore
        newInstance[localKey] ??= value;
      }
    });
    // @ts-ignore
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

async function saveAVObject(object: AV.Object, options: SaveAVObjectOptions = {}) {
  const { ignoreBeforeHooks, ignoreAfterHooks, ...saveOptions } = options;

  // @ts-ignore
  const ignoredHooks = _.clone(object._flags.__ignore_hooks);
  if (ignoreBeforeHooks) {
    object.disableBeforeHook();
  }
  if (ignoreAfterHooks) {
    object.disableAfterHook();
  }
  try {
    await object.save(null, saveOptions);
  } finally {
    // @ts-ignore
    object._flags.__ignore_hooks = ignoredHooks;
  }
}
