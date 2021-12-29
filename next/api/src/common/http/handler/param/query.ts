import { Context } from 'koa';

import { Pipe } from '@/common/pipe';
import { getParams } from '.';

type QueryPipe = Pipe<string | string[] | undefined, any>;

const queryGetter = (ctx: Context) => ctx.query;

export function Query(name?: string): ParameterDecorator;
export function Query(name: string, ...pipes: QueryPipe[]): ParameterDecorator;
export function Query(...pipes: QueryPipe[]): ParameterDecorator;
export function Query(arg1?: string | QueryPipe, ...pipes: QueryPipe[]): ParameterDecorator {
  const name = typeof arg1 === 'string' ? arg1 : undefined;
  if (arg1 && typeof arg1 !== 'string') {
    pipes.unshift(arg1);
  }

  return (target, controllerMethod, index) => {
    getParams(target).push({
      controllerMethod,
      position: 'query',
      index,
      getData: name ? (ctx) => ctx.query[name] : queryGetter,
      pipes,
    });
  };
}
