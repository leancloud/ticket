import _ from 'lodash';

import { getParams } from '.';

export function Locales(): ParameterDecorator {
  return (target, controllerMethod, index) => {
    getParams(target).push({
      controllerMethod,
      index,
      getData: (ctx) => ctx.locales,
    });
  };
}

export { ILocale } from '@/middleware/locale';
