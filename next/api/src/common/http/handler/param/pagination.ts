import _ from 'lodash';

import { getParams } from '.';

export function Pagination(defaultPageSize = 10): ParameterDecorator {
  return (target, controllerMethod, index) => {
    getParams(target).push({
      controllerMethod,
      position: 'query',
      index,
      getData: (ctx) => {
        const pagination: [number, number] = [1, defaultPageSize];
        const { page, pageSize } = ctx.query;

        if (typeof page === 'string') {
          const num = parseInt(page);
          if (!Number.isNaN(num)) {
            pagination[0] = Math.max(num, 1);
          }
        }

        if (typeof pageSize === 'string') {
          const num = parseInt(pageSize);
          if (!Number.isNaN(num)) {
            pagination[1] = Math.max(Math.min(num, 1000), 0);
          }
        }

        return pagination;
      },
    });
  };
}
