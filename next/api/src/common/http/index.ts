import 'reflect-metadata';
import { Middleware } from 'koa';
import Router from '@koa/router';
import _ from 'lodash';

import { createKoaHandler, getHandlers } from './handler';
import { HttpError } from './error';

export * from './handler';
export * from './error';

const KEY_PATH = Symbol('path');
const KEY_MIDDLEWARES = Symbol('middlewares');

const globalMiddlewares: Middleware[] = [HttpError.catchHttpError];
const controllers: any[] = [];

export interface ControllerConstructor {
  new (): any;
}

export function Controller(path: string | string[]) {
  return (target: ControllerConstructor) => {
    Reflect.defineMetadata(KEY_PATH, [path].flat(), target);
    controllers.push(Reflect.construct(target, []));
  };
}

export function getControllers() {
  return controllers.slice();
}

interface MiddlewareConfig {
  middleware: Middleware;
  controllerMethod?: string;
}

function getMiddlewares(controller: any): MiddlewareConfig[] {
  if (!Reflect.hasMetadata(KEY_MIDDLEWARES, controller)) {
    Reflect.defineMetadata(KEY_MIDDLEWARES, [], controller);
  }
  return Reflect.getMetadata(KEY_MIDDLEWARES, controller);
}

export function UseMiddlewares(...middlewares: Middleware[]) {
  return (target: any, controllerMethod?: string) => {
    const _middlewares = getMiddlewares(target.prototype ?? target);
    middlewares.forEach((middleware) => {
      _middlewares.push({
        middleware,
        controllerMethod,
      });
    });
  };
}

export function StatusCode(status: number) {
  return UseMiddlewares((ctx, next) => {
    ctx.status = status;
    return next();
  });
}

interface ResponseClass {
  new (data: any): any;
}

export function ResponseBody(responseClass: ResponseClass) {
  return UseMiddlewares(async (ctx, next) => {
    await next();
    if (ctx.body) {
      if (Array.isArray(ctx.body)) {
        ctx.body = ctx.body.map((data) => new responseClass(data));
      } else {
        ctx.body = new responseClass(ctx.body);
      }
    }
  });
}

function joinPaths(paths: string[]) {
  return '/' + paths.map((path) => _.trim(path, '/')).join('/');
}

export function applyController(router: Router, controller: any) {
  const basePaths = Reflect.getMetadata(KEY_PATH, controller.constructor) as string[];

  const middlewares = getMiddlewares(controller);

  const controllerMiddlewares = middlewares
    .filter((c) => c.controllerMethod === undefined)
    .map((c) => c.middleware);

  const handlers = getHandlers(controller);

  basePaths.map((basePath) =>
    handlers.forEach((handler) => {
      const path = handler.path ? joinPaths([basePath, handler.path]) : joinPaths([basePath]);

      const handlerMiddlewares = middlewares
        .filter((c) => c.controllerMethod === handler.controllerMethod)
        .map((c) => c.middleware);

      const h = createKoaHandler(controller, handler);

      // @ts-ignore
      router[handler.httpMethod].apply(router, [
        path,
        ...globalMiddlewares,
        ...controllerMiddlewares,
        ...handlerMiddlewares,
        h,
      ]);
    })
  );
}
