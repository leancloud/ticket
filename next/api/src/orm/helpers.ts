import AV from 'leancloud-storage';
import _ from 'lodash';

import { Field, Model, SerializedField } from './model';
import {
  BelongsTo,
  HasManyThroughIdArray,
  HasManyThroughPointerArray,
  ModelGetter,
  PointTo,
} from './relation';

export type DefineFieldOptions = Partial<Field> & Pick<Field, 'localKey'>;

function defineField(model: typeof Model, options: DefineFieldOptions) {
  const { localKey, avObjectKey = localKey, encode = _.identity, decode = _.identity } = options;

  model.setField({ localKey, avObjectKey, encode, decode });
}

export function field(config?: string | Partial<Omit<Field, 'localKey'>>) {
  return (target: Model, localKey: string) => {
    const model = target.constructor as typeof Model;
    if (typeof config === 'string') {
      defineField(model, { localKey, avObjectKey: config });
    } else {
      defineField(model, { ...config, localKey });
    }
  };
}

export type DefineSerializedFieldOptions = Partial<SerializedField> & Pick<SerializedField, 'key'>;

function defineSerializedField(model: typeof Model, options: DefineSerializedFieldOptions) {
  const { key, encode = _.identity, decode = _.identity } = options;

  model.setSerializedField(key, { key, encode, decode });
}

export function serialize(config?: Omit<DefineSerializedFieldOptions, 'key'>) {
  return (target: Model, key: string) => {
    const model = target.constructor as typeof Model;
    defineSerializedField(model, { ...config, key });
  };
}

export function pointerId(getPointedModel: ModelGetter, avObjectKey?: string) {
  return (target: Model, localKey: string) => {
    avObjectKey ??= localKey.endsWith('Id') ? localKey.slice(0, -2) : localKey;
    defineField(target.constructor as typeof Model, {
      localKey,
      avObjectKey,
      encode: (id: string) => {
        const className = getPointedModel().getClassName();
        return AV.Object.createWithoutData(className, id);
      },
      decode: (obj: AV.Object) => obj.id,
    });
  };
}

export function pointerIds(getPointerModel: ModelGetter, avObjectKey?: string) {
  return (target: Model, localKey: string) => {
    avObjectKey ??= localKey.endsWith('Ids') ? localKey.slice(0, -3) + 's' : localKey;
    defineField(target.constructor as typeof Model, {
      localKey,
      avObjectKey,
      encode: (ids: string[]) => {
        const className = getPointerModel().getClassName();
        return ids.map((id) => AV.Object.createWithoutData(className, id));
      },
      decode: (objs: AV.Object[]) => objs.map((o) => o.id),
    });
  };
}

export function belongsTo(
  getRelatedModel: ModelGetter,
  getRelatedId?: string | BelongsTo['getRelatedId']
) {
  return (target: Model, name: string) => {
    if (getRelatedId === undefined) {
      getRelatedId = name + 'Id';
    }
    if (typeof getRelatedId === 'string') {
      const idKey = getRelatedId;
      getRelatedId = (o) => o[idKey];
    }
    const model = target.constructor as typeof Model;
    model.setRelation({
      name,
      type: 'belongsTo',
      model,
      getRelatedModel,
      getRelatedId,
    });
  };
}

export function hasOne(getRelatedModel: ModelGetter, pointerKey?: string) {
  return (target: Model, name: string) => {
    const model = target.constructor as typeof Model;
    if (pointerKey === undefined) {
      pointerKey = model.getClassName().toLowerCase();
    }
    model.setRelation({
      name,
      type: 'hasOne',
      model,
      getRelatedModel,
      pointerKey,
    });
  };
}

export function pointTo(
  getRelatedModel: ModelGetter,
  includeKey?: string,
  getRelatedId?: string | PointTo['getRelatedId']
) {
  return (target: Model, name: string) => {
    if (getRelatedId === undefined) {
      getRelatedId = name + 'Id';
    }
    if (typeof getRelatedId === 'string') {
      const key = getRelatedId;
      getRelatedId = (o) => o[key];
    }
    const model = target.constructor as typeof Model;
    model.setRelation({
      name,
      type: 'pointTo',
      model,
      getRelatedModel,
      getRelatedId,
      includeKey: includeKey ?? name,
    });
  };
}

export function hasManyThroughIdArray(
  getRelatedModel: ModelGetter,
  getRelatedIds?: string | HasManyThroughIdArray['getRelatedIds']
) {
  return (target: Model, name: string) => {
    if (getRelatedIds === undefined) {
      getRelatedIds = (name.endsWith('s') ? name.slice(0, -1) : name) + 'Ids';
    }
    if (typeof getRelatedIds === 'string') {
      const key = getRelatedIds;
      getRelatedIds = (o) => o[key];
    }
    const model = target.constructor as typeof Model;
    model.setRelation({
      name,
      type: 'hasManyThroughIdArray',
      model,
      getRelatedModel,
      getRelatedIds,
    });
  };
}

export function hasManyThroughPointerArray(
  getRelatedModel: ModelGetter,
  includeKey?: string,
  getRelatedIds?: string | HasManyThroughPointerArray['getRelatedIds']
) {
  return (target: Model, name: string) => {
    if (getRelatedIds === undefined) {
      getRelatedIds = (name.endsWith('s') ? name.slice(0, -1) : name) + 'Ids';
    }
    if (typeof getRelatedIds === 'string') {
      const key = getRelatedIds;
      getRelatedIds = (o) => o[key];
    }
    const model = target.constructor as typeof Model;
    model.setRelation({
      name,
      type: 'hasManyThroughPointerArray',
      model,
      getRelatedModel,
      getRelatedIds,
      includeKey: includeKey ?? name,
    });
  };
}

export function hasManyThroughRelation(getRelatedModel: ModelGetter, relatedKey?: string) {
  return (target: Model, name: string) => {
    const model = target.constructor as typeof Model;
    model.setRelation({
      name,
      type: 'hasManyThroughRelation',
      model,
      getRelatedModel,
      relatedKey: relatedKey ?? name,
    });
  };
}

export const SERIALIZE = {
  DATE: {
    encode: (data: Date) => data?.toISOString(),
    decode: (data?: string) => (data ? new Date(data) : undefined),
  },
};
