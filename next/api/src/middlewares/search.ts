import { Middleware } from 'koa';

import { Field, parse as parseQ } from '../utils/search';

export interface SortItem {
  key: string;
  order: 'asc' | 'desc';
}

export interface Searching {
  text: string[];
  eq: Record<string, string>;
  ne: Record<string, string>;
  gt: Record<string, string>;
  gte: Record<string, string>;
  lt: Record<string, string>;
  lte: Record<string, string>;
}

function parse(q: string): Searching {
  const result: Searching = {
    text: [],
    eq: {},
    ne: {},
    gt: {},
    gte: {},
    lt: {},
    lte: {},
  };

  const fields = parseQ(q);
  const fieldByKey = fields.reduce<Record<string, Field>>((map, field) => {
    map[field.key] = field;
    return map;
  }, {});

  Object.values(fieldByKey).forEach((field) => {
    switch (field.type) {
      case 'text':
        result.text.push(field.key);
        break;
      case 'eq':
      case 'ne':
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
        result[field.type][field.key] = field.value;
        break;
      case 'range':
        if (field.value.from !== '*') {
          result.gte[field.key] = field.value.from;
        }
        if (field.value.to !== '*') {
          result.lt[field.key] = field.value.to;
        }
        break;
    }
  });

  return result;
}

export const search: Middleware = (ctx, next) => {
  if (typeof ctx.query.q === 'string') {
    const { eq, gt, gte, lt, lte } = parse(ctx.query.q);
    Object.keys(eq).forEach((key) => (ctx.query[key] = eq[key]));
    Object.keys(gt).forEach((key) => (ctx.query[key + '_gt'] = gt[key]));
    Object.keys(gte).forEach((key) => (ctx.query[key + '_gte'] = gte[key]));
    Object.keys(lt).forEach((key) => (ctx.query[key + '_lt'] = lt[key]));
    Object.keys(lte).forEach((key) => (ctx.query[key + '_lte'] = lte[key]));
    delete ctx.query.q;
  }
  return next();
};

function parseSort(key: string): SortItem {
  let order: SortItem['order'] = 'asc';
  if (key.endsWith('-asc')) {
    key = key.slice(0, -4);
  } else if (key.endsWith('-desc')) {
    key = key.slice(0, -5);
    order = 'desc';
  }
  return { key, order };
}

export const sort: Middleware = (ctx, next) => {
  if (ctx.query.sort) {
    let keys: string[];
    if (typeof ctx.query.sort === 'string') {
      keys = ctx.query.sort.split(',');
    } else {
      keys = ctx.query.sort;
    }
    ctx.state.sort = keys.map(parseSort);
  } else {
    ctx.state.sort = [];
  }
  return next();
};
