import { Model } from './model';

import { KeysOfType } from './utils';

export type RelationName<M extends typeof Model> = Extract<
  KeysOfType<Required<InstanceType<M>>, Model | Model[]>,
  string
>;

export type ModelGetter = () => typeof Model;

export enum RelationType {
  BelongsTo,
  BelongsToThroughPointer,
  HasManyThroughIdArray,
  HasManyThroughPointerArray,
  HasManyThroughRelation,
}

export interface BelongsTo {
  type: RelationType.BelongsTo;
  model: typeof Model;
  field: string;
  getRelatedModel: ModelGetter;
  relatedIdField: string;
}

export interface BelongsToThroughPointer {
  type: RelationType.BelongsToThroughPointer;
  model: typeof Model;
  field: string;
  getRelatedModel: ModelGetter;
  pointerKey: string;
  relatedIdField: string;
}

export interface HasManyThroughIdArray {
  type: RelationType.HasManyThroughIdArray;
  model: typeof Model;
  field: string;
  idArrayField: string;
  getRelatedModel: ModelGetter;
}

export interface HasManyThroughPointerArray {
  type: RelationType.HasManyThroughPointerArray;
  model: typeof Model;
  field: string;
  pointerArrayKey: string;
  getRelatedModel: ModelGetter;
  idArrayField: string;
}

export interface HasManyThroughRelation {
  type: RelationType.HasManyThroughRelation;
  model: typeof Model;
  field: string;
  getRelatedModel: ModelGetter;
  relatedKey: string;
}

export type Relation =
  | BelongsTo
  | BelongsToThroughPointer
  | HasManyThroughIdArray
  | HasManyThroughPointerArray
  | HasManyThroughRelation;
