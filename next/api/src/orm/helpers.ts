import AV from 'leancloud-storage';
import _ from 'lodash';

import { Field, Model } from './model';
import {
  BelongsTo,
  HasManyThroughIdArray,
  HasManyThroughPointerArray,
  ModelGetter,
  PointTo,
} from './relation';

export type DefineFieldOptions = Partial<Field> & Pick<Field, 'localKey'>;

export function defineField(modelClass: typeof Model, options: DefineFieldOptions) {
  const {
    localKey,
    avObjectKey = localKey,
    encode = _.identity,
    decode = _.identity,
    onEncode,
    onDecode,
  } = options;

  modelClass.setField(localKey, {
    localKey,
    avObjectKey,
    encode,
    decode,
    onEncode,
    onDecode,
  });
}

export function field(config?: string | Partial<Omit<DefineFieldOptions, 'localKey'>>) {
  return (target: Model, localKey: string) => {
    const modelClass = target.constructor as typeof Model;
    if (typeof config === 'string') {
      defineField(modelClass, { localKey, avObjectKey: config });
    } else {
      defineField(modelClass, { ...config, localKey });
    }
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
        AV.Object.createWithoutData(className, id);
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
        ids.map((id) => AV.Object.createWithoutData(className, id));
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
    model.setRelation(name, {
      name,
      type: 'belongsTo',
      model,
      getRelatedModel,
      getRelatedId,
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
    model.setRelation(name, {
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
    model.setRelation(name, {
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
    model.setRelation(name, {
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
    model.setRelation(name, {
      name,
      type: 'hasManyThroughRelation',
      model,
      getRelatedModel,
      relatedKey: relatedKey ?? name,
    });
  };
}
