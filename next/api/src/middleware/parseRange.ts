import { Middleware } from 'koa';

export function parseRange(...fields: string[]): Middleware {
  return (ctx, next) => {
    for (const field of fields) {
      const value = ctx.query[field];
      if (typeof value !== 'string') {
        continue;
      }
      if (value.includes('..')) {
        const range = value.split('..');
        if (range.length !== 2) {
          ctx.throw(400, `query.${field} is invalid`);
        }
        const [from, to] = range;
        if (from !== '*') {
          ctx.query[field + 'From'] = from;
        }
        if (to !== '*') {
          ctx.query[field + 'To'] = to;
        }
        delete ctx.query[field];
      }
    }
    return next();
  };
}
