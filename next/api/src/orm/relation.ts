import { Model } from './model';

import { KeysOfType } from './utils';

export type RelationName<M extends typeof Model> = Extract<
  KeysOfType<InstanceType<M>, Model | Model[] | undefined>,
  string
>;

export type ModelGetter = () => typeof Model;

export interface BelongsTo {
  name: string;
  type: 'belongsTo';
  model: typeof Model;
  getRelatedModel: ModelGetter;
  getRelatedId: (instance: any) => string | undefined;
}

export interface PointTo extends Omit<BelongsTo, 'type'> {
  type: 'pointTo';
  includeKey: string;
}

export interface HasManyThroughIdArray {
  name: string;
  type: 'hasManyThroughIdArray';
  model: typeof Model;
  getRelatedModel: ModelGetter;
  getRelatedIds: (instance: any) => string[] | undefined;
}

export interface HasManyThroughPointerArray extends Omit<HasManyThroughIdArray, 'type'> {
  type: 'hasManyThroughPointerArray';
  includeKey: string;
}

export interface HasManyThroughRelation {
  name: string;
  type: 'hasManyThroughRelation';
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
