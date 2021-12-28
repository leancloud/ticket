import 'reflect-metadata';
import { Middleware } from 'koa';
import Router from '@koa/router';
import _ from 'lodash';
import mem from 'mem';

import { createKoaHandler, getHandlers } from './handler';
import { HttpError } from './error';

export * from './handler';
export * from './error';

const KEY_PATH = Symbol('path');
const KEY_MIDDLEWARES = Symbol('middlewares');

const globalMiddlewares: Middleware[] = [HttpError.catchHttpError];
const controllers: any[] = [];

export function Controller(path: string) {
  return (target: any) => {
    Reflect.defineMetadata(KEY_PATH, path, target);
    controllers.push(target);
  };
}

function getMiddlewares(controller: any): [string | undefined, Middleware][] {
  if (!Reflect.hasMetadata(KEY_MIDDLEWARES, controller)) {
    Reflect.defineMetadata(KEY_MIDDLEWARES, [], controller);
  }
  return Reflect.getMetadata(KEY_MIDDLEWARES, controller);
}

export function UseMiddlewares(...middlewares: Middleware[]) {
  return (target: any, handlerName?: string) => {
    const _middlewares = getMiddlewares(target.prototype ?? target);
    middlewares.forEach((m) => _middlewares.push([handlerName, m]));
  };
}

export function StatusCode(status: number) {
  return UseMiddlewares((ctx, next) => {
    ctx.status = status;
    return next();
  });
}

export const getControllers = mem(() => {
  return controllers.map((controller) => new controller());
});

function joinPaths(paths: string[]) {
  return '/' + paths.map((path) => _.trim(path, '/')).join('/');
}

export function applyController(router: Router, controller: any) {
  const basePath = Reflect.getMetadata(KEY_PATH, controller.constructor);

  const middlewares = getMiddlewares(controller);

  const controllerMiddlewares = middlewares
    .filter(([name]) => name === undefined)
    .map(([, middleware]) => middleware);

  const handlers = getHandlers(controller);

  handlers.forEach((handler) => {
    const path = handler.path ? joinPaths([basePath, handler.path]) : joinPaths([basePath]);

    const handlerMiddlewares = middlewares
      .filter(([name]) => name === handler.controllerMethod)
      .map(([, middleware]) => middleware);

    const h = createKoaHandler(controller, handler);

    console.log(handler.httpMethod, path);
    // @ts-ignore
    router[handler.httpMethod].apply(router, [
      path,
      ...globalMiddlewares,
      ...controllerMiddlewares,
      ...handlerMiddlewares,
      h,
    ]);
  });
}
