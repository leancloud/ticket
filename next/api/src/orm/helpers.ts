import AV from 'leancloud-storage';
import _ from 'lodash';

import { Field, Model } from './model';
import { RelatedIdGetter, RelatedIdsGetter } from './relation';

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

export function pointerId(pointerClass: typeof Model, avObjectKey?: string) {
  return (target: Model, localKey: string) => {
    const modelClass = target.constructor as typeof Model;
    avObjectKey ??= localKey.endsWith('Id') ? localKey.slice(0, -2) : localKey;
    const className = pointerClass.getClassName();
    defineField(modelClass, {
      localKey,
      avObjectKey,
      encode: (id: string) => AV.Object.createWithoutData(className, id),
      decode: (obj: AV.Object) => obj.id,
    });
  };
}

export function pointerArray(pointerClass: typeof Model, avObjectKey?: string) {
  return (target: Model, localKey: string) => {
    const modelClass = target.constructor as typeof Model;
    avObjectKey ??= localKey.endsWith('Ids') ? localKey.slice(0, -3) + 's' : localKey;
    const className = pointerClass.getClassName();
    defineField(modelClass, {
      localKey,
      avObjectKey,
      encode: (ids: string[]) => ids.map((id) => AV.Object.createWithoutData(className, id)),
      decode: (objs: AV.Object[]) => objs.map((o) => o.id),
    });
  };
}

export function belongsTo(
  relatedModel: typeof Model,
  getRelatedId?: string | RelatedIdGetter<any>
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
      relatedModel,
      getRelatedId,
    });
  };
}

export function pointTo(
  relatedModel: typeof Model,
  includeKey?: string,
  getRelatedId?: string | RelatedIdGetter<any>
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
      relatedModel,
      getRelatedId,
      includeKey: includeKey ?? name,
    });
  };
}

export function hasManyThroughIdArray(
  relatedModel: typeof Model,
  getRelatedIds?: string | RelatedIdsGetter<any>
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
      relatedModel,
      getRelatedIds,
    });
  };
}

export function hasManyThroughPointerArray(
  relatedModel: typeof Model,
  includeKey?: string,
  getRelatedIds?: string | RelatedIdsGetter<any>
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
      relatedModel,
      getRelatedIds,
      includeKey: includeKey ?? name,
    });
  };
}
