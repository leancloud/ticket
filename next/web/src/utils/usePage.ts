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

export interface UsePageOptions {
  key?: string;
  min?: number;
  max?: number;
}

export function usePage({ key = 'page', min = 1, max }: UsePageOptions = {}) {
  const result = useQueryParam(key, PageParam);
  result[0] = Math.max(result[0], min);
  if (max !== undefined) {
    result[0] = Math.min(result[0], max);
  }
  return result;
}
