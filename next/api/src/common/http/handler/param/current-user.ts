import { Context } from 'koa';
import _ from 'lodash';

import { getParams } from '.';

function getCurrentUser(ctx: Context) {
  const { currentUser } = ctx.state;
  ctx.assert(currentUser, 401);
  return currentUser;
}

export function CurrentUser(): ParameterDecorator {
  return (target, controllerMethod, index) => {
    getParams(target).push({
      controllerMethod,
      index,
      getData: getCurrentUser,
    });
  };
}
