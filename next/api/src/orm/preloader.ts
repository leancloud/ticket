import AV from 'leancloud-storage';
import _ from 'lodash';

import { Model } from './model';
import {
  BelongsTo,
  HasManyThroughIdArray,
  HasManyThroughPointerArray,
  HasManyThroughRelation,
  HasOne,
  PointTo,
  RelationName,
} from './relation';
import { AuthOptions, AVQuery, QueryBuilder } from './query';

export interface BeforeQueryConntext {
  avQuery: AVQuery;
}

export interface AfterQueryContext {
  objects: AV.Object[];
}

export interface Item extends Record<string, any> {
  id: string;
}

export interface Preloader {
  data?: Item[];
  queryModifier?: (query: QueryBuilder<any>) => void;
  beforeQuery?: (ctx: BeforeQueryConntext) => void | Promise<void>;
  afterQuery?: (ctx: AfterQueryContext) => void | Promise<void>;
  load: (items: Item[], options?: AuthOptions) => Promise<void>;
}

class BelongsToPreloader {
  data?: Item[];
  queryModifier?: (query: QueryBuilder<any>) => void;

  constructor(private relation: BelongsTo) {}

  async load(items: Item[], options?: AuthOptions) {
    if (items.length === 0) {
      return;
    }

    const { name, getRelatedModel, getRelatedId } = this.relation;

    const relatedItems = this.data ?? [];

    const ids = _(items)
      .map(getRelatedId)
      .compact()
      .uniq()
      .difference(relatedItems.map((item) => item.id))
      .value();

    if (ids.length) {
      const query = getRelatedModel().queryBuilder();
      this.queryModifier?.(query);
      query.where('objectId', 'in', ids);
      const fetchedItems = await query.find(options);
      fetchedItems.forEach((item) => relatedItems.push(item));
    }

    const relatedItemMap = _.keyBy(relatedItems, (t) => t.id);

    items.forEach((item) => {
      const relatedId = getRelatedId(item);
      if (relatedId) {
        const relatedItem = relatedItemMap[relatedId];
        if (relatedItem) {
          item[name] = relatedItem;
        }
      }
    });
  }
}

class PointToPreloader {
  queryModifier?: (query: QueryBuilder<any>) => void;

  private objects?: AV.Object[];

  constructor(private relation: PointTo) {}

  beforeQuery({ avQuery }: BeforeQueryConntext) {
    avQuery.include(this.relation.includeKey);
  }

  afterQuery({ objects }: AfterQueryContext) {
    this.objects = objects;
  }

  async load(items: Item[], options?: AuthOptions) {
    if (this.objects) {
      const { name, getRelatedModel, includeKey } = this.relation;
      const relatedModel = getRelatedModel();
      const objectMap = _.keyBy(this.objects, (o) => o.id!);
      items.forEach((item) => {
        const object = objectMap[item.id];
        const subObject = object.get(includeKey) as AV.Object | undefined;
        if (subObject) {
          const data = relatedModel.fromAVObject(subObject);
          item[name] = data;
        }
      });
    } else {
      // 退化成 BelongsToPreloader
      const preloader = new BelongsToPreloader({ ...this.relation, type: 'belongsTo' });
      preloader.queryModifier = this.queryModifier;
      await preloader.load(items, options);
    }
  }
}

class HasOnePreloader {
  data?: Item[];
  queryModifier?: (query: QueryBuilder<any>) => void;

  constructor(private relation: HasOne) {}

  async load(items: Item[], options?: AuthOptions) {
    if (items.length === 0) {
      return;
    }

    const { name, model, getRelatedModel, pointerKey } = this.relation;

    const relatedItems = this.data ?? [];

    const pointers = _(items)
      .map('id')
      .uniq()
      .difference(relatedItems.map((item) => item.id))
      .map((id) => model.ptr(id))
      .value();

    if (pointers.length) {
      const query = getRelatedModel().queryBuilder();
      this.queryModifier?.(query);
      query.where(pointerKey, 'in', pointers);
      const fetchedItems = await query.find(options);
      fetchedItems.forEach((item) => relatedItems.push(item));
    }

    const itemMap = _.keyBy(items, 'id');
    const idKey = pointerKey + 'Id';

    relatedItems.forEach((relatedItem) => {
      const id = relatedItem[idKey];
      if (id) {
        const item = itemMap[id];
        if (item) {
          item[name] = relatedItem;
        }
      }
    });
  }
}

class HasManyThroughIdArrayPreloader {
  data?: Item[];
  queryModifier?: (query: QueryBuilder<any>) => void;

  constructor(private relation: HasManyThroughIdArray) {}

  async load(items: Item[], options?: AuthOptions) {
    if (items.length === 0) {
      return;
    }

    const { name, getRelatedModel, getRelatedIds } = this.relation;

    const relatedItems = this.data ?? [];

    const ids = _(items)
      .map(getRelatedIds)
      .compact()
      .flatten()
      .uniq()
      .difference(relatedItems.map((item) => item.id))
      .value();

    if (ids.length) {
      const query = getRelatedModel().queryBuilder();
      this.queryModifier?.(query);
      query.where('objectId', 'in', ids);
      const fetchedItems = await query.find(options);
      fetchedItems.forEach((item) => relatedItems.push(item));
    }

    const relatedItemMap = _.keyBy(relatedItems, (t) => t.id);
    items.forEach((item) => {
      const relatedIds = getRelatedIds(item);
      if (relatedIds) {
        const relatedItems = relatedIds.map((id) => relatedItemMap[id]);
        item[name] = _.compact(relatedItems);
      }
    });
  }
}

class HasManyThroughPointerArrayPreloader {
  queryModifier?: (query: QueryBuilder<any>) => void;

  private objects?: AV.Object[];

  constructor(private relation: HasManyThroughPointerArray) {}

  beforeQuery({ avQuery }: BeforeQueryConntext) {
    avQuery.include(this.relation.includeKey);
  }

  afterQuery({ objects }: AfterQueryContext) {
    this.objects = objects;
  }

  async load(items: Item[], options?: AuthOptions) {
    if (this.objects) {
      const { name, getRelatedModel, includeKey } = this.relation;
      const relatedModel = getRelatedModel();
      const objectMap = _.keyBy(this.objects, (o) => o.id!);
      items.forEach((item) => {
        const object = objectMap[item.id];
        const subObjects = object.get(includeKey) as AV.Object[] | undefined;
        if (subObjects) {
          const data = subObjects.map((o) => relatedModel.fromAVObject(o));
          item[name] = data;
        }
      });
    } else {
      // 退化成 HasManyThroughIdArrayPreloader
      const preloader = new HasManyThroughIdArrayPreloader({
        ...this.relation,
        type: 'hasManyThroughIdArray',
      });
      preloader.queryModifier = this.queryModifier;
      await preloader.load(items, options);
    }
  }
}

class HasManyThroughRelationPreloader {
  queryModifier?: (query: QueryBuilder<any>) => void;

  constructor(private relation: HasManyThroughRelation) {}

  async load(items: Item[], options?: AuthOptions) {
    if (items.length === 0) {
      return;
    }

    const { name, model, getRelatedModel, relatedKey } = this.relation;
    const relatedModel = getRelatedModel();

    const tasks = items.map(async (item) => {
      const query = relatedModel.queryBuilder();
      this.queryModifier?.(query);
      query.relatedTo(model, relatedKey, item.id);
      item[name] = await query.find(options);
    });

    await Promise.all(tasks);
  }
}

export function preloaderFactory<M extends typeof Model, N extends RelationName<M>>(
  model: M,
  name: N
): Preloader {
  const relation = model.getRelation(name);
  if (!relation) {
    throw new Error(`Cannot create preloader, relation ${name} is not exists`);
  }
  switch (relation.type) {
    case 'belongsTo':
      return new BelongsToPreloader(relation);
    case 'pointTo':
      return new PointToPreloader(relation);
    case 'hasOne':
      return new HasOnePreloader(relation);
    case 'hasManyThroughIdArray':
      return new HasManyThroughIdArrayPreloader(relation);
    case 'hasManyThroughPointerArray':
      return new HasManyThroughPointerArrayPreloader(relation);
    case 'hasManyThroughRelation':
      return new HasManyThroughRelationPreloader(relation);
  }
}
