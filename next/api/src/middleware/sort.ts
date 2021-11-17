import type { Context, Middleware } from 'koa';

export interface SortItem {
  key: string;
  order: 'asc' | 'desc';
}

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

function sortMiddlewareFactory(queryKey: string, fields?: string[]): Middleware {
  return (ctx, next) => {
    const data = ctx.query[queryKey];
    if (data) {
      ctx.state.sort = [];
      const keys = typeof data === 'string' ? data.split(',') : data;
      keys.forEach((key) => {
        const item = parseSort(key);
        if (fields && !fields.includes(item.key)) {
          ctx.throw(400, `${queryKey} must be one of ${fields.join(', ')}`);
        }
        ctx.state.sort.push(item);
      });
    }
    return next();
  };
}

function getSortItems(ctx: Context): SortItem[] | undefined {
  return ctx.state.sort;
}

export const sort = Object.assign(sortMiddlewareFactory, {
  get: getSortItems,
});
