import { Context } from 'koa';
import _ from 'lodash';

import { Pipe } from '@/common/pipe';

const METADATA_KEY = Symbol('params');

export interface HandlerParam {
  controllerMethod: string | symbol;
  position?: 'query' | 'body'; // 帮助 validation pipe 提供更友好的错误提示
  index: number;
  getData: (ctx: Context) => any;
  pipes?: Pipe<any, any>[];
}

export function getParams(controller: any): HandlerParam[] {
  if (!Reflect.hasMetadata(METADATA_KEY, controller)) {
    Reflect.defineMetadata(METADATA_KEY, [], controller);
  }
  return Reflect.getMetadata(METADATA_KEY, controller);
}

async function runPipes(ctx: Context, param: HandlerParam) {
  const { getData, pipes } = param;
  let data = getData(ctx);
  if (pipes) {
    for (const pipe of pipes) {
      data = await pipe.transform(data, ctx, param);
    }
  }
  return data;
}

export function getArguments(ctx: Context, params: HandlerParam[]): Promise<any[]> | undefined {
  if (params.length) {
    const args = new Array(params.length);
    params.forEach((param) => {
      args[param.index] = runPipes(ctx, param);
    });
    return Promise.all(args);
  }
}

export * from './url-param';
export * from './query';
export * from './body';
export * from './pagination';
export * from './current-user';

export function Ctx(): ParameterDecorator {
  return (target, controllerMethod, index) => {
    getParams(target).push({
      controllerMethod,
      index,
      getData: _.identity,
    });
  };
}
