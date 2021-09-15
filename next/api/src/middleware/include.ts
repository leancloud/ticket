import { Middleware } from 'koa';

export const include: Middleware = (ctx, next) => {
  const { include } = ctx.query;
  if (include) {
    const keys = Array.isArray(include) ? include : include.split(',');
    keys.forEach((key) => {
      if (key) {
        const param = 'include' + key.slice(0, 1).toUpperCase() + key.slice(1);
        ctx.query[param] = 'true';
      }
    });
    delete ctx.query.include;
  }
  return next();
};
