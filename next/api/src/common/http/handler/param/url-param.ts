import { Pipe } from '@/common/pipe';
import { getParams } from '.';

type ParamPipe = Pipe<string, any>;

export function Param(name: string, ...pipes: ParamPipe[]): ParameterDecorator {
  return (target, controllerMethod, index) => {
    getParams(target).push({
      controllerMethod,
      index,
      getData: (ctx) => ctx.params[name],
      pipes,
    });
  };
}
