import { Middleware } from 'koa';

import { Field, parse as parseQ } from '@/utils/search';

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
    Object.keys(gt).forEach((key) => (ctx.query[key + 'GT'] = gt[key]));
    Object.keys(gte).forEach((key) => (ctx.query[key + 'GTE'] = gte[key]));
    Object.keys(lt).forEach((key) => (ctx.query[key + 'LT'] = lt[key]));
    Object.keys(lte).forEach((key) => (ctx.query[key + 'LTE'] = lte[key]));
    delete ctx.query.q;
  }
  return next();
};
