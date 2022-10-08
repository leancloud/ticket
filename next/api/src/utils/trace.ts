import { Context, Middleware } from 'koa';

function wrapAsyncFnWithSpan<T extends any[], R>(
  asyncFn: (...params: T) => Promise<R>,
  ctx: Context,
  op: string,
  description?: string
) {
  return async (...params: T) => {
    const span = ctx.__sentry_transaction.startChild({
      op,
      description,
    });
    const result = await asyncFn(...params);
    span.finish();
    return result;
  };
}

export function withSpan(middleware: Middleware, name = middleware.name): Middleware {
  return (ctx, next) => wrapAsyncFnWithSpan(middleware, ctx, 'middleware', name)(ctx, next);
}

export async function withAsyncSpan<R>(
  asyncFn: () => Promise<R>,
  ctx: Context,
  op: string,
  description?: string
) {
  return wrapAsyncFnWithSpan(asyncFn, ctx, op, description)();
}
