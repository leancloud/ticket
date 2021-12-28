import AV from 'leancloud-storage';
import _ from 'lodash';

import { Field, Model, SerializedField } from './model';
import { ModelGetter, RelationType } from './relation';

function lowercaseFirstChar(str: string): string {
  if (str.length) {
    return str.slice(0, 1).toLowerCase() + str.slice(1);
  }
  return '';
}

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

export function belongsTo(getRelatedModel: ModelGetter, relatedIdField?: string) {
  return (target: Model, field: string) => {
    const model = target.constructor as typeof Model;
    model.setRelation({
      type: RelationType.BelongsTo,
      field,
      model,
      getRelatedModel,
      relatedIdField: relatedIdField ?? field + 'Id',
    });
  };
}

export function belongsToThroughPointer(
  getRelatedModel: ModelGetter,
  pointerKey?: string,
  relatedIdField?: string
) {
  return (target: Model, field: string) => {
    const model = target.constructor as typeof Model;
    model.setRelation({
      type: RelationType.BelongsToThroughPointer,
      field,
      model,
      getRelatedModel,
      pointerKey: pointerKey ?? field,
      relatedIdField: relatedIdField ?? field + 'Id',
    });
  };
}

// alias
export const pointTo = belongsToThroughPointer;

export function hasMany(
  getRelatedModel: ModelGetter,
  foreignKey?: string,
  foreignKeyField?: string
) {
  return (target: Model, field: string) => {
    const model = target.constructor as typeof Model;
    foreignKey ??= lowercaseFirstChar(model.getClassName()) + 'Id';
    model.setRelation({
      type: RelationType.HasMany,
      model,
      field,
      getRelatedModel,
      foreignKey,
      foreignKeyField: foreignKeyField ?? foreignKey,
    });
  };
}

export function hasManyThroughPointer(
  getRelatedModel: ModelGetter,
  foreignPointerKey?: string,
  foreignKeyField?: string
) {
  return (target: Model, field: string) => {
    const model = target.constructor as typeof Model;
    foreignPointerKey ??= lowercaseFirstChar(model.getClassName());
    model.setRelation({
      type: RelationType.HasManyThroughPointer,
      model,
      field,
      getRelatedModel,
      foreignPointerKey,
      foreignKeyField: foreignKeyField ?? foreignPointerKey + 'Id',
    });
  };
}

export function hasManyThroughIdArray(getRelatedModel: ModelGetter, idArrayField?: string) {
  return (target: Model, field: string) => {
    const model = target.constructor as typeof Model;
    model.setRelation({
      type: RelationType.HasManyThroughIdArray,
      model,
      field,
      idArrayField: idArrayField ?? (field.endsWith('s') ? field.slice(0, -1) : field) + 'Ids',
      getRelatedModel,
    });
  };
}

export function hasManyThroughPointerArray(
  getRelatedModel: ModelGetter,
  pointerArrayKey?: string,
  idArrayField?: string
) {
  return (target: Model, field: string) => {
    const model = target.constructor as typeof Model;
    model.setRelation({
      type: RelationType.HasManyThroughPointerArray,
      model,
      field,
      pointerArrayKey: pointerArrayKey ?? field,
      getRelatedModel,
      idArrayField: idArrayField ?? (field.endsWith('s') ? field.slice(0, -1) : field) + 'Ids',
    });
  };
}

export function hasManyThroughRelation(getRelatedModel: ModelGetter, relatedKey?: string) {
  return (target: Model, field: string) => {
    const model = target.constructor as typeof Model;
    model.setRelation({
      type: RelationType.HasManyThroughRelation,
      model,
      field,
      getRelatedModel,
      relatedKey: relatedKey ?? field,
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
