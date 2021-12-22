import AV from 'leancloud-storage';
import _ from 'lodash';

import { Field, Model, SerializedField } from './model';
import {
  BelongsTo,
  HasManyThroughIdArray,
  HasManyThroughPointerArray,
  ModelGetter,
  PointTo,
  RelationType,
} from './relation';

export function field(config?: string | Partial<Omit<Field, 'localKey'>>) {
  return (target: Model, localKey: string) => {
    const model = target.constructor as typeof Model;
    if (typeof config === 'string') {
      model.setField(localKey, { avObjectKey: config });
    } else {
      model.setField(localKey, config);
    }
  };
}

export function pointerId(getPointedModel: ModelGetter, avObjectKey?: string) {
  return (target: Model, localKey: string) => {
    avObjectKey ??= localKey.endsWith('Id') ? localKey.slice(0, -2) : localKey;
    const model = target.constructor as typeof Model;
    model.setField(localKey, {
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
    const model = target.constructor as typeof Model;
    model.setField(localKey, {
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
      type: RelationType.BelongsTo,
      name,
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
      type: RelationType.HasOne,
      name,
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
      type: RelationType.PointTo,
      name,
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
      type: RelationType.HasManyThroughIdArray,
      name,
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
      type: RelationType.HasManyThroughPointerArray,
      name,
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
      type: RelationType.HasManyThroughRelation,
      name,
      model,
      getRelatedModel,
      relatedKey: relatedKey ?? name,
    });
  };
}

function serializeDecoratorFactory(config?: Partial<Omit<SerializedField, 'key'>>) {
  return (target: Model, key: string) => {
    const model = target.constructor as typeof Model;
    model.setSerializedField(key, config);
  };
}

const SERIALIZE = {
  Date: () => {
    return serializeDecoratorFactory({
      encode: (data: Date) => data?.toISOString(),
      decode: (data?: string) => (data ? new Date(data) : undefined),
    });
  },
};

export const serialize = Object.assign(serializeDecoratorFactory, SERIALIZE);
