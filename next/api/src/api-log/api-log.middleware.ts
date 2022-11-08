import { Middleware } from 'koa';
import apiLogService from './api-log.service';

export function apiLogMiddleware(): Middleware {
  const appId = process.env.LEANCLOUD_APP_ID!;

  return (ctx, next) => {
    const startTime = new Date();

    ctx.res.on('finish', () => {
      if (!ctx.routerPath) {
        return;
      }

      const endTime = new Date();
      const productId = ctx.header['x-product'];

      apiLogService.write({
        timestamp: startTime.toISOString(),
        method: ctx.method,
        route: ctx.routerPath,
        url: ctx.url,
        host: ctx.host,
        statusCode: ctx.status,
        processTime: endTime.getTime() - startTime.getTime(),
        appId,
        productId: typeof productId === 'string' ? productId : undefined,
        userId: ctx.state.currentUser?.id,
        userAgent: ctx.header['user-agent'],
        referer: ctx.header['referer'],
      });
    });

    return next();
  };
}
