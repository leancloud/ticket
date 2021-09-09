import AV from 'leancloud-storage';
import _ from 'lodash';

import { Model } from './model';
import { BelongsTo, HasManyThroughIdArray, HasManyThroughPointerArray, PointTo } from './relation';
import { AuthOptions, AVQuery } from './query';
import { KeysOfType } from './utils';

export type PreloadKeys<M extends typeof Model> = Extract<
  KeysOfType<InstanceType<M>, Model | Model[] | undefined>,
  string
>;

export type PreloadData<
  M extends typeof Model,
  K extends PreloadKeys<M> = PreloadKeys<M>
> = NonNullable<InstanceType<M>[K]>[];

export interface BeforeQueryConntext {
  avQuery: AVQuery;
}

export interface AfterQueryContext {
  objects: AV.Object[];
}

export interface Preloader<M extends typeof Model, K extends PreloadKeys<M> = PreloadKeys<M>> {
  data?: PreloadData<M, K>;
  beforeQuery?: (ctx: BeforeQueryConntext) => void | Promise<void>;
  afterQuery?: (ctx: AfterQueryContext) => void | Promise<void>;
  load: (items: InstanceType<M>[], options?: AuthOptions) => Promise<void>;
}

class BelongsToPreloader<
  M extends typeof Model,
  R extends typeof Model,
  K extends PreloadKeys<M> = PreloadKeys<M>
> {
  data?: PreloadData<M, K>;

  constructor(private relation: BelongsTo<M, R>) {}

  async load(items: InstanceType<M>[], options?: AuthOptions) {
    if (items.length === 0) {
      return;
    }

    const { name, relatedModel, getRelatedId } = this.relation;

    let relatedItems: InstanceType<R>[];
    if (this.data) {
      relatedItems = this.data;
    } else {
      const ids = _.uniq(items.map(getRelatedId).filter(_.isString));
      if (ids.length === 0) {
        return;
      }
      const query = relatedModel.query().where('objectId', 'in', ids);
      relatedItems = await query.find(options);
    }

    const relatedItemMap = _.keyBy(relatedItems, (t) => t.id);

    items.forEach((item) => {
      const relatedId = getRelatedId(item);
      if (relatedId) {
        const relatedItem = relatedItemMap[relatedId];
        if (relatedItem) {
          item[name as keyof typeof item] = relatedItem as any;
        }
      }
    });
  }
}

class PointToPreloader<M extends typeof Model, R extends typeof Model> {
  private objects?: AV.Object[];

  constructor(private relation: PointTo<M, R>) {}

  beforeQuery({ avQuery }: BeforeQueryConntext) {
    avQuery.include(this.relation.includeKey);
  }

  afterQuery({ objects }: AfterQueryContext) {
    this.objects = objects;
  }

  async load(items: InstanceType<M>[], options?: AuthOptions) {
    if (this.objects) {
      const { name, relatedModel, includeKey } = this.relation;
      const objectMap = _.keyBy(this.objects, (o) => o.id!);
      items.forEach((item) => {
        const object = objectMap[item.id];
        const subObject = object.get(includeKey) as AV.Object | undefined;
        if (subObject) {
          const data = relatedModel.fromAVObject(subObject);
          item[name as keyof typeof item] = data as any;
        }
      });
    } else {
      // 退化成 BelongsToPreloader
      const preloader = new BelongsToPreloader({ ...this.relation, type: 'belongsTo' });
      await preloader.load(items, options);
    }
  }
}

class HasManyThrouchIdArrayPreloader<
  M extends typeof Model,
  R extends typeof Model,
  K extends PreloadKeys<M> = PreloadKeys<M>
> {
  data?: PreloadData<M, K>;

  constructor(private relation: HasManyThroughIdArray<M, R>) {}

  async load(items: InstanceType<M>[], options?: AuthOptions) {
    if (items.length === 0) {
      return;
    }

    const { name, relatedModel, getRelatedIds } = this.relation;

    let relatedItems: InstanceType<R>[];
    if (this.data) {
      relatedItems = this.data;
    } else {
      const ids = _.uniq(items.map(getRelatedIds).flat().filter(_.isString));
      if (ids.length === 0) {
        return;
      }
      const query = relatedModel.query().where('objectId', 'in', ids);
      relatedItems = await query.find(options);
    }

    const relatedItemMap = _.keyBy(relatedItems, (t) => t.id);

    items.forEach((item) => {
      const relatedIds = getRelatedIds(item);
      if (relatedIds) {
        const relatedItems = relatedIds.map((id) => relatedItemMap[id]);
        item[name as keyof typeof item] = _.compact(relatedItems) as any;
      }
    });
  }
}

class HasManyThrouchPointerArrayPreloader<M extends typeof Model, R extends typeof Model> {
  private objects?: AV.Object[];

  constructor(private relation: HasManyThroughPointerArray<M, R>) {}

  beforeQuery({ avQuery }: BeforeQueryConntext) {
    avQuery.include(this.relation.includeKey);
  }

  afterQuery({ objects }: AfterQueryContext) {
    this.objects = objects;
  }

  async load(items: InstanceType<M>[], options?: AuthOptions) {
    if (this.objects) {
      const { name, relatedModel, includeKey } = this.relation;
      const objectMap = _.keyBy(this.objects, (o) => o.id!);
      items.forEach((item) => {
        const object = objectMap[item.id];
        const subObjects = object.get(includeKey) as AV.Object[] | undefined;
        if (subObjects) {
          const data = subObjects.map((o) => relatedModel.fromAVObject(o));
          item[name as keyof typeof item] = data as any;
        }
      });
    } else {
      // 退化成 HasManyThrouchIdArrayPreloader
      const preloader = new HasManyThrouchIdArrayPreloader({
        ...this.relation,
        type: 'hasManyThroughIdArray',
      });
      await preloader.load(items, options);
    }
  }
}

export function preloaderFactory<M extends typeof Model>(
  model: M,
  key: PreloadKeys<M>
): Preloader<M> {
  const relation = model.getRelation(key);
  if (!relation) {
    throw new Error(`Cannot create preloader, relation ${key} is not exists`);
  }
  switch (relation.type) {
    case 'belongsTo':
      return new BelongsToPreloader(relation);
    case 'pointTo':
      return new PointToPreloader(relation);
    case 'hasManyThroughIdArray':
      return new HasManyThrouchIdArrayPreloader(relation);
    case 'hasManyThroughPointerArray':
      return new HasManyThrouchPointerArrayPreloader(relation);
  }
}
