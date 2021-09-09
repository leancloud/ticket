import { Model } from './model';

type DataGetter<M extends Model, T> = (instance: M) => T;

export type RelatedIdGetter<M extends Model> = DataGetter<M, string | undefined>;

export type RelatedIdsGetter<M extends Model> = DataGetter<M, string[] | undefined>;

export interface BelongsTo<
  M extends typeof Model = typeof Model,
  R extends typeof Model = typeof Model
> {
  name: string;
  type: 'belongsTo';
  model: M;
  relatedModel: R;
  getRelatedId: RelatedIdGetter<InstanceType<M>>;
}

export interface PointTo<M extends typeof Model, R extends typeof Model>
  extends Omit<BelongsTo<M, R>, 'type'> {
  type: 'pointTo';
  includeKey: string;
}

export interface HasManyThroughIdArray<M extends typeof Model, R extends typeof Model> {
  name: string;
  type: 'hasManyThroughIdArray';
  model: M;
  relatedModel: R;
  getRelatedIds: RelatedIdsGetter<InstanceType<M>>;
}

export interface HasManyThroughPointerArray<M extends typeof Model, R extends typeof Model>
  extends Omit<HasManyThroughIdArray<M, R>, 'type'> {
  type: 'hasManyThroughPointerArray';
  includeKey: string;
}

export type Relation<
  M extends typeof Model = typeof Model,
  R extends typeof Model = typeof Model
> =
  | BelongsTo<M, R>
  | PointTo<M, R>
  | HasManyThroughIdArray<M, R>
  | HasManyThroughPointerArray<M, R>;
