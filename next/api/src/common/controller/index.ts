import 'reflect-metadata';
import { Context, Middleware } from 'koa';
import Router from '@koa/router';
import _ from 'lodash';

const KEY_PATH = Symbol('path');
const KEY_MIDDLEWARES = Symbol('middlewares');
const KEY_HANDLERS = Symbol('handlers');
const KEY_PARAMS = Symbol('params');

const controllers: any[] = [];

interface Handler {
  propertyKey: string;
  method: string;
  path?: string;
}

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

function getHandlers(controller: any): Handler[] {
  if (!Reflect.hasMetadata(KEY_HANDLERS, controller)) {
    Reflect.defineMetadata(KEY_HANDLERS, [], controller);
  }
  return Reflect.getMetadata(KEY_HANDLERS, controller);
}

function Handler(method: string, path?: string) {
  return (target: any, propertyKey: string) => {
    getHandlers(target).push({ propertyKey, method, path });
  };
}

export const Get = (path?: string) => Handler('get', path);
export const Post = (path?: string) => Handler('post', path);
export const Patch = (path?: string) => Handler('patch', path);
export const Delete = (path?: string) => Handler('delete', path);

export function getControllers() {
  return controllers.map((controller) => new controller());
}

interface Param {
  methodName: string;
  index: number;
  wrapper: (ctx: Context) => any;
}

function getParams(controller: any): Param[] {
  if (!Reflect.hasMetadata(KEY_PARAMS, controller)) {
    Reflect.defineMetadata(KEY_PARAMS, [], controller);
  }
  return Reflect.getMetadata(KEY_PARAMS, controller);
}

export function Ctx() {
  return (target: any, methodName: string, index: number) => {
    getParams(target).push({
      methodName,
      index,
      wrapper: _.identity,
    });
  };
}

export function Param(name: string) {
  return (target: any, methodName: string, index: number) => {
    getParams(target).push({
      methodName,
      index,
      wrapper: (ctx) => ctx.params[name],
    });
  };
}

const queryGetter = (ctx: Context) => ctx.query;

export function Query(name?: string) {
  return (target: any, methodName: string, index: number) => {
    getParams(target).push({
      methodName,
      index,
      wrapper: name ? (ctx) => ctx.query[name] : queryGetter,
    });
  };
}

const bodyGetter = (ctx: Context) => ctx.request.body;

export function Body(name?: string) {
  return (target: any, methodName: string, index: number) => {
    getParams(target).push({
      methodName,
      index,
      wrapper: name ? (ctx) => _.get(ctx.request.body, name) : bodyGetter,
    });
  };
}

function createHandler(controller: any, info: Handler) {
  const { propertyKey } = info;
  const params = getParams(controller);
  const currentParams = params?.filter((p) => p.methodName === propertyKey);

  return async (ctx: Context) => {
    let args: any[] | undefined;
    if (currentParams) {
      args = new Array(currentParams.length);
      currentParams.forEach(({ index, wrapper }) => {
        args![index] = wrapper(ctx);
      });
      args = await Promise.all(args);
    }

    const response = (controller[propertyKey] as Function).apply(controller, args);
    if (response) {
      if (response.then) {
        ctx.body = await response;
      } else {
        ctx.body = response;
      }
    }
  };
}

function joinPaths(paths: string[]) {
  return '/' + paths.map((path) => _.trim(path, '/')).join('/');
}

export function applyController(router: Router, controller: any) {
  const basePath = Reflect.getMetadata(KEY_PATH, controller.constructor);

  const middlewares = getMiddlewares(controller);
  const globalMiddlewares = middlewares
    .filter(([name]) => name === undefined)
    .map(([, middleware]) => middleware);

  const handlers = getHandlers(controller);

  handlers.forEach((handler) => {
    const path = handler.path ? joinPaths([basePath, handler.path]) : joinPaths([basePath]);

    const handlerMiddlewares = middlewares
      .filter(([name]) => name === handler.propertyKey)
      .map(([, middleware]) => middleware);

    const h = createHandler(controller, handler);

    // @ts-ignore
    router[handler.method].apply(router, [path, ...globalMiddlewares, ...handlerMiddlewares, h]);
  });
}
