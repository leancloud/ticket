import AV from 'leancloud-storage';
import _ from 'lodash';

import { AuthOptions, Query, QueryBuilder } from './query';
import { KeysOfType } from './utils';
import { Relation } from './relation';
import { preloaderFactory } from './preloader';

type RelationKeys<T> = Extract<KeysOfType<T, Model | Model[] | undefined>, string>;

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

export interface BeforeCreateContext {
  avObject: AV.Object;
}

export type BeforeCreateHook = (context: BeforeCreateContext) => void | Promise<void>;

export interface AfterCreateContext<M extends typeof Model> {
  instance: InstanceType<M>;
}

export type AfterCreateHook<M extends typeof Model> = (context: AfterCreateContext<M>) => void;

export type CreateData<T> = Partial<
  Omit<T, 'id' | 'createdAt' | 'updatedAt' | KeysOfType<T, Function>>
>;

export interface SaveAVObjectOptions extends AuthOptions {
  ignoreBeforeHooks?: boolean;
  ignoreAfterHooks?: boolean;
  fetchWhenSave?: boolean;
}

export abstract class Model {
  static readonly className: string;

  static readonly avObjectConstructor = AV.Object;

  private static fields: Record<string, Field>;

  private static relations: Record<string, Relation>;

  private static beforeCreateHooks: BeforeCreateHook[];

  private static afterCreateHooks: AfterCreateHook<any>[];

  readonly id!: string;

  readonly createdAt!: Date;

  readonly updatedAt!: Date;

  get className() {
    return (this.constructor as typeof Model).getClassName();
  }

  static getClassName(): string {
    return this.className ?? this.name;
  }

  static setField(name: string, field: Field) {
    this.fields ??= {};
    this.fields[name] = field;
  }

  static setRelation(name: string, relation: Relation) {
    this.relations ??= {};
    this.relations[name] = relation;
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

  async reload<M extends Model, K extends RelationKeys<M>>(
    this: M,
    key: K,
    options?: AuthOptions
  ): Promise<M[K]> {
    const preloader = preloaderFactory(this.constructor as any, key);
    await preloader.load([this], options);
    return this[key as keyof M] as M[K];
  }

  load<M extends Model, K extends RelationKeys<M>>(
    this: M,
    key: K,
    options?: AuthOptions
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

  toJSON(): any {
    return {
      id: this.id,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  toAVObject(): AV.Object {
    const clazz = this.constructor as typeof Model;
    const className = clazz.getClassName();
    const AVObject = clazz.avObjectConstructor;

    const object = this.id
      ? AVObject.createWithoutData(className, this.id)
      : new AVObject(className);

    Object.values(clazz.fields).forEach(({ localKey, avObjectKey, encode, onEncode }) => {
      if (encode) {
        const value = this[localKey as keyof this];
        if (value !== undefined) {
          const encodedValue = encode(value);
          if (encodedValue !== undefined) {
            object.set(avObjectKey, encodedValue);
          }
        }
      }
      onEncode?.(this, object);
    });
    return object;
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
