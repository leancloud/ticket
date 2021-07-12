import { Context, Middleware } from 'koa';

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
  sort: SortItem[];
}

function parseSort(value: string): Searching['sort'] {
  return value.split(',').map((key) => {
    let order: 'asc' | 'desc' = 'asc';
    if (key.endsWith('-asc')) {
      key = key.slice(0, -4);
    } else if (key.endsWith('-desc')) {
      key = key.slice(0, -5);
      order = 'desc';
    }
    return { key, order };
  });
}

export function parse(q: string): Searching {
  const result: Searching = {
    text: [],
    eq: {},
    ne: {},
    gt: {},
    gte: {},
    lt: {},
    lte: {},
    sort: [],
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
        if (field.key === 'sort') {
          result.sort = parseSort(field.value);
        } else {
          result.eq[field.key] = field.value;
        }
        break;
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

export interface SearchOptions {
  sortKeyMap?: Record<string, string>;
}

export function search(options?: SearchOptions): Middleware {
  return (ctx, next) => {
    if (typeof ctx.query.q === 'string') {
      const { eq, gt, gte, lt, lte, sort } = parse(ctx.query.q);
      Object.keys(eq).forEach((key) => (ctx.query[key] = eq[key]));
      Object.keys(gt).forEach((key) => (ctx.query[key + '_gt'] = gt[key]));
      Object.keys(gte).forEach((key) => (ctx.query[key + '_gte'] = gte[key]));
      Object.keys(lt).forEach((key) => (ctx.query[key + '_lt'] = lt[key]));
      Object.keys(lte).forEach((key) => (ctx.query[key + '_lte'] = lte[key]));
      delete ctx.query.q;

      if (options?.sortKeyMap) {
        const { sortKeyMap } = options;
        if (!sort.every(({ key }) => sortKeyMap[key])) {
          ctx.throw(400, 'sort must be one of ' + Object.keys(sortKeyMap).join(', '));
        }
        ctx.state.sort = sort.map(({ key, order }) => ({ order, key: sortKeyMap[key] }));
      }
    }
    return next();
  };
}
