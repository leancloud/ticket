import { QueryParamConfig, useQueryParam } from 'use-query-params';

const PageParam: QueryParamConfig<number> = {
  encode: (data) => {
    if (!data || data === 1) {
      return undefined;
    }
    return data.toString();
  },
  decode: (data) => {
    if (Array.isArray(data)) {
      const last = data[data.length - 1];
      return last ? parseInt(last) : 1;
    }
    return data ? parseInt(data) : 1;
  },
};

export const usePage = (key = 'page') => useQueryParam(key, PageParam);
