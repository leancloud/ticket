import { Model } from './model';

import { KeysOfType } from './utils';

export type RelationName<M extends typeof Model> = Extract<
  KeysOfType<Required<InstanceType<M>>, Model | Model[]>,
  string
>;

export type ModelGetter = () => typeof Model;

export enum RelationType {
  BelongsTo,
  PointTo,
  HasManyThroughIdArray,
  HasManyThroughPointerArray,
  HasManyThroughRelation,
}

export interface BelongsTo {
  name: string;
  type: RelationType.BelongsTo;
  model: typeof Model;
  getRelatedModel: ModelGetter;
  getRelatedId: (instance: any) => string | undefined;
}

export interface PointTo extends Omit<BelongsTo, 'type'> {
  type: RelationType.PointTo;
  includeKey: string;
}

export interface HasManyThroughIdArray {
  name: string;
  type: RelationType.HasManyThroughIdArray;
  model: typeof Model;
  getRelatedModel: ModelGetter;
  getRelatedIds: (instance: any) => string[] | undefined;
}

export interface HasManyThroughPointerArray extends Omit<HasManyThroughIdArray, 'type'> {
  type: RelationType.HasManyThroughPointerArray;
  includeKey: string;
}

export interface HasManyThroughRelation {
  name: string;
  type: RelationType.HasManyThroughRelation;
  model: typeof Model;
  getRelatedModel: ModelGetter;
  relatedKey: string;
}

export type Relation =
  | BelongsTo
  | PointTo
  | HasManyThroughIdArray
  | HasManyThroughPointerArray
  | HasManyThroughRelation;
