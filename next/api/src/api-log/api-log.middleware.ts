import { Middleware } from 'koa';
import { ApiLog, ApiLogMiddlewareOptions } from './types';
import apiLogService from './api-log.service';

export function apiLogMiddleware({ appId }: ApiLogMiddlewareOptions = {}): Middleware {
  return (ctx, next) => {
    const startTime = new Date();
    ctx.res.on('finish', () => {
      const endTime = new Date();
      const productId = ctx.header['x-product'];

      const apiLog: ApiLog = {
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
      };

      apiLogService.write(apiLog);
    });

    return next();
  };
}
