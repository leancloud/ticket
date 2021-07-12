import type { Middleware } from 'koa';

export function csv2array(field: string): Middleware {
  return (ctx, next) => {
    const value = ctx.query[field];
    if (value && !Array.isArray(value)) {
      ctx.query[field] = value.split(',');
    }
    return next();
  };
}
