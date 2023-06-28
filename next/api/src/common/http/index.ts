import 'reflect-metadata';
import { Middleware } from 'koa';
import Router from '@koa/router';
import _ from 'lodash';

import { createKoaHandler, getHandlers } from './handler';

export * from './handler';
export * from './error';

const KEY_CONTROLLER_CONFIG = Symbol('CONTROLLER_CONFIG');
const KEY_MIDDLEWARES = Symbol('MIDDLEWARES');

const controllers: Function[] = [];

interface ControllerConfig {
  path: string | string[];
  router?: Router;
}

export function Controller(...paths: string[]): ClassDecorator;
export function Controller(paths: string[]): ClassDecorator;
export function Controller(config: ControllerConfig): ClassDecorator;
export function Controller(
  arg1: string | string[] | ControllerConfig,
  ...paths: string[]
): ClassDecorator {
  const config: ControllerConfig =
    typeof arg1 === 'string'
      ? { path: [arg1, ...paths] }
      : Array.isArray(arg1)
      ? { path: arg1 }
      : arg1;

  return (target) => {
    Reflect.defineMetadata(KEY_CONTROLLER_CONFIG, config, target);
    controllers.push(target);
  };
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

function applyController(rootRouter: Router, controller: any) {
  const config: ControllerConfig = Reflect.getMetadata(
    KEY_CONTROLLER_CONFIG,
    controller.constructor
  );

  const middlewares = getMiddlewares(controller);

  const controllerMiddlewares = middlewares
    .filter((c) => c.controllerMethod === undefined)
    .map((c) => c.middleware);

  if (config.router && controllerMiddlewares.length) {
    throw new Error(
      `Controller ${controller.constructor.name} has router config, controller level middlewares are not allowed`
    );
  }

  const router = config.router ?? new Router().use(...controllerMiddlewares);

  getHandlers(controller).forEach((handler) => {
    const path = handler.path ? joinPaths([handler.path]) : '/';

    const handlerMiddlewares = middlewares
      .filter((c) => c.controllerMethod === handler.controllerMethod)
      .map((c) => c.middleware);

    const h = createKoaHandler(controller, handler);

    router[handler.httpMethod](path, ...handlerMiddlewares, h);
  });

  const routes = router.routes();
  _.castArray(config.path).forEach((path) => {
    rootRouter.use(joinPaths([path]), routes);
  });
}

export function initControllers(rootRouter: Router) {
  controllers
    .map((controller) => Reflect.construct(controller, []))
    .forEach((controller) => applyController(rootRouter, controller));
}
