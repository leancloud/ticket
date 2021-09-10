import AV from 'leancloud-storage';
import _ from 'lodash';

import { AuthOptions, Query } from './query';
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

  readonly id!: string;

  readonly createdAt!: Date;

  readonly updatedAt!: Date;

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
    const query = new Query(this);
    query.builderMode = true;
    return query;
  }

  static async find<M extends typeof Model>(
    this: M,
    id: string,
    options?: AuthOptions
  ): Promise<InstanceType<M>> {
    const query = new AV.Query<AV.Object>(this.getClassName());
    const object = await query.get(id, options);
    return this.fromAVObject(object);
  }

  get className() {
    return (this.constructor as typeof Model).getClassName();
  }

  async load<M extends Model, K extends RelationKeys<M>>(
    this: M,
    field: K,
    options?: AuthOptions
  ): Promise<M[K]> {
    if (this[field as keyof M] !== undefined) {
      return this[field as keyof M] as M[K];
    }
    const preloader = preloaderFactory(this.constructor as any, field);
    await preloader.load([this], options);
    return this[field as keyof M] as M[K];
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
    const instance = new this() as InstanceType<M>;
    Object.entries(data).forEach(([key, value]) => {
      // @ts-ignore
      instance[key] = value;
    });

    const avObj = instance.toAVObject();
    await saveAVObject(avObj, { ...options, fetchWhenSave: true });

    return this.fromAVObject(avObj);
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
