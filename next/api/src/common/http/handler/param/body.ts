import { Context } from 'koa';
import _ from 'lodash';

import { Pipe } from '@/common/pipe';
import { getParams } from '.';

const bodyGetter = (ctx: Context) => ctx.request.body;

export function Body(name?: string): ParameterDecorator;
export function Body(name: string, ...pipes: Pipe<any, any>[]): ParameterDecorator;
export function Body(...pipes: Pipe<any, any>[]): ParameterDecorator;
export function Body(
  arg1?: string | Pipe<any, any>,
  ...pipes: Pipe<any, any>[]
): ParameterDecorator {
  const name = typeof arg1 === 'string' ? arg1 : undefined;
  if (arg1 && typeof arg1 !== 'string') {
    pipes.unshift(arg1);
  }

  return (target, controllerMethod, index) => {
    getParams(target).push({
      controllerMethod,
      position: 'body',
      index,
      getData: name ? (ctx) => _.get(ctx.request.body, name) : bodyGetter,
      pipes,
    });
  };
}
