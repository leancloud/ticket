import type { Context, Middleware } from 'koa';

function factory(defaultPageSize = 10, maxPageSize = 1000): Middleware {
  return (ctx, next) => {
    ctx.state.page = 1;
    ctx.state.pageSize = defaultPageSize;

    if (typeof ctx.query.page === 'string') {
      const value = parseInt(ctx.query.page);
      if (!Number.isNaN(value) && value > 0) {
        ctx.state.page = value;
      }
    }

    if (typeof ctx.query.pageSize === 'string') {
      const value = parseInt(ctx.query.pageSize);
      if (!Number.isNaN(value) && value >= 0 && value <= maxPageSize) {
        ctx.state.pageSize = value;
      }
    }

    return next();
  };
}

function get(ctx: Context): { page: number; pageSize: number } {
  return {
    page: ctx.state.page,
    pageSize: ctx.state.pageSize,
  };
}

export const pagination = Object.assign(factory, { get });
