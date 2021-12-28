import 'reflect-metadata';
import { Context } from 'koa';

import { getArguments, getParams } from '.';

const METADATA_KEY = Symbol('handlers');

export type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

export interface Handler {
  controllerMethod: string | symbol;
  httpMethod: HttpMethod;
  path?: string;
}

export function getHandlers(controller: any): Handler[] {
  if (!Reflect.hasMetadata(METADATA_KEY, controller)) {
    Reflect.defineMetadata(METADATA_KEY, [], controller);
  }
  return Reflect.getMetadata(METADATA_KEY, controller);
}

export function Handler(httpMethod: HttpMethod, path?: string) {
  return (controller: any, controllerMethod: string) => {
    getHandlers(controller).push({ controllerMethod, httpMethod, path });
  };
}

export const Get = (path?: string) => Handler('get', path);
export const Post = (path?: string) => Handler('post', path);
export const Patch = (path?: string) => Handler('patch', path);
export const Delete = (path?: string) => Handler('delete', path);

export function createKoaHandler(controller: any, handler: Handler) {
  const { controllerMethod } = handler;
  const params = getParams(controller).filter((p) => p.controllerMethod === controllerMethod);

  return async (ctx: Context) => {
    const args = await getArguments(ctx, params);
    const body = controller[controllerMethod].apply(controller, args);
    if (body !== undefined) {
      if (body.then) {
        ctx.body = await body;
      } else {
        ctx.body = body;
      }
    }
  };
}

export * from './param';
