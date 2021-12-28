import AV from 'leancloud-storage';
import _ from 'lodash';

import { Model } from './model';
import {
  BelongsTo,
  BelongsToThroughPointer,
  HasMany,
  HasManyThroughIdArray,
  HasManyThroughPointer,
  HasManyThroughPointerArray,
  HasManyThroughRelation,
  RelationName,
  RelationType,
} from './relation';
import { AuthOptions, AVQuery, QueryBuilder } from './query';

export interface BeforeQueryContext {
  avQuery: AVQuery;
}

export interface AfterQueryContext {
  avObjects: AV.Object[];
}

export interface Item extends Record<string, any> {
  id: string;
}

export interface Preloader {
  queryModifier?: (query: QueryBuilder<any>) => void;
  beforeQuery?: (ctx: BeforeQueryContext) => void | Promise<void>;
  afterQuery?: (ctx: AfterQueryContext) => void | Promise<void>;
  load: (items: Item[], options?: AuthOptions) => Promise<void>;
}

class BelongsToPreloader {
  queryModifier?: (query: QueryBuilder<any>) => void;

  constructor(private relation: BelongsTo) {}

  async load(items: Item[], options?: AuthOptions) {
    if (items.length === 0) {
      return;
    }

    const { field, getRelatedModel, relatedIdField } = this.relation;

    items = items.filter((item) => item[relatedIdField]);
    const ids: string[] = items.map((item) => item[relatedIdField]);

    const query = getRelatedModel().queryBuilder();
    this.queryModifier?.(query);
    query.where('objectId', 'in', ids);
    const relatedItems = await query.find(options);

    const relatedItemMap = _.keyBy(relatedItems, 'id');

    items.forEach((item) => {
      const relatedId: string = item[relatedIdField];
      item[field] = relatedItemMap[relatedId];
    });
  }
}

class BelongsToThroughPointerPreloader {
  queryModifier?: (query: QueryBuilder<any>) => void;

  private avObjects?: AV.Object[];

  constructor(private relation: BelongsToThroughPointer) {}

  beforeQuery({ avQuery }: BeforeQueryContext) {
    avQuery.include(this.relation.pointerKey);
  }

  afterQuery({ avObjects }: AfterQueryContext) {
    this.avObjects = avObjects;
  }

  async load(items: Item[], options?: AuthOptions) {
    if (items.length === 0) {
      return;
    }

    if (this.avObjects) {
      const { field, getRelatedModel, pointerKey } = this.relation;
      const relatedModel = getRelatedModel();

      const avObjectMap = _.keyBy(this.avObjects, 'id');
      items.forEach((item) => {
        const avObject = avObjectMap[item.id];
        if (avObject) {
          const relatedAVObject = avObject.get(pointerKey) as AV.Object | undefined;
          if (relatedAVObject) {
            item[field] = relatedModel.fromAVObject(relatedAVObject);
          }
        }
      });
    } else {
      // 退化成 BelongsToPreloader
      const preloader = new BelongsToPreloader({ ...this.relation, type: RelationType.BelongsTo });
      preloader.queryModifier = this.queryModifier;
      await preloader.load(items, options);
    }
  }
}

class HasManyPreloader {
  queryModifier?: (query: QueryBuilder<any>) => void;

  constructor(private relation: HasMany) {}

  async load(items: Item[], options?: AuthOptions) {
    if (items.length === 0) {
      return;
    }

    const { field, getRelatedModel, foreignKey, foreignKeyField } = this.relation;

    const query = getRelatedModel().queryBuilder();
    this.queryModifier?.(query);
    const ids = items.map((item) => item.id);
    query.where(foreignKey, 'in', ids);
    const relatedItems = await query.find(options);

    const relatedItemGroups = _.groupBy(relatedItems, foreignKeyField);

    items.forEach((item) => {
      item[field] = relatedItemGroups[item.id];
    });
  }
}

class HasManyThroughPointerPreloader {
  queryModifier?: (query: QueryBuilder<any>) => void;

  constructor(private relation: HasManyThroughPointer) {}

  async load(items: Item[], options?: AuthOptions) {
    if (items.length === 0) {
      return;
    }

    const { model, field, getRelatedModel, foreignPointerKey, foreignKeyField } = this.relation;

    const query = getRelatedModel().queryBuilder();
    this.queryModifier?.(query);
    const pointers = items.map((item) => model.ptr(item.id));
    query.where(foreignPointerKey, 'in', pointers);
    const relatedItems = await query.find(options);

    const relatedItemGroups = _.groupBy(relatedItems, foreignKeyField);

    items.forEach((item) => {
      item[field] = relatedItemGroups[item.id];
    });
  }
}

class HasManyThroughIdArrayPreloader {
  queryModifier?: (query: QueryBuilder<any>) => void;

  constructor(private relation: HasManyThroughIdArray) {}

  async load(items: Item[], options?: AuthOptions) {
    if (items.length === 0) {
      return;
    }

    const { field, idArrayField, getRelatedModel } = this.relation;

    items = items.filter((item) => item[idArrayField]);
    const idArrays: string[][] = items.map((item) => item[idArrayField]);

    const query = getRelatedModel().queryBuilder();
    this.queryModifier?.(query);
    query.where('objectId', 'in', idArrays.flat());
    const relatedItems = await query.find(options);

    const relatedItemMap = _.keyBy(relatedItems, 'id');

    items.forEach((item) => {
      const relatedIds: string[] = item[idArrayField];
      const relatedItems = relatedIds.map((id) => relatedItemMap[id]);
      item[field] = _.compact(relatedItems);
    });
  }
}

class HasManyThroughPointerArrayPreloader {
  queryModifier?: (query: QueryBuilder<any>) => void;

  private avObjects?: AV.Object[];

  constructor(private relation: HasManyThroughPointerArray) {}

  beforeQuery({ avQuery }: BeforeQueryContext) {
    avQuery.include(this.relation.pointerArrayKey);
  }

  afterQuery({ avObjects }: AfterQueryContext) {
    this.avObjects = avObjects;
  }

  async load(items: Item[], options?: AuthOptions) {
    if (items.length === 0) {
      return;
    }

    if (this.avObjects) {
      const { field, pointerArrayKey, getRelatedModel } = this.relation;
      const relatedModel = getRelatedModel();

      const avObjectMap = _.keyBy(this.avObjects, 'id');
      items.forEach((item) => {
        const avObject = avObjectMap[item.id];
        if (avObject) {
          const relatedAVObjects = avObject.get(pointerArrayKey) as AV.Object[] | undefined;
          if (relatedAVObjects) {
            item[field] = relatedAVObjects.map((obj) => relatedModel.fromAVObject(obj));
          }
        }
      });
    } else {
      // 退化成 HasManyThroughIdArrayPreloader
      const preloader = new HasManyThroughIdArrayPreloader({
        ...this.relation,
        type: RelationType.HasManyThroughIdArray,
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

    const { field, model, getRelatedModel, relatedKey } = this.relation;
    const relatedModel = getRelatedModel();

    const tasks = items.map(async (item) => {
      const query = relatedModel.queryBuilder();
      this.queryModifier?.(query);
      query.relatedTo(model, relatedKey, item.id);
      item[field] = await query.find(options);
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
    case RelationType.BelongsTo:
      return new BelongsToPreloader(relation);
    case RelationType.BelongsToThroughPointer:
      return new BelongsToThroughPointerPreloader(relation);
    case RelationType.HasMany:
      return new HasManyPreloader(relation);
    case RelationType.HasManyThroughPointer:
      return new HasManyThroughPointerPreloader(relation);
    case RelationType.HasManyThroughIdArray:
      return new HasManyThroughIdArrayPreloader(relation);
    case RelationType.HasManyThroughPointerArray:
      return new HasManyThroughPointerArrayPreloader(relation);
    case RelationType.HasManyThroughRelation:
      return new HasManyThroughRelationPreloader(relation);
  }
}
