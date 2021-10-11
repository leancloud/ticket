import { useCallback, useMemo } from 'react';
import { QueryParamConfig, StringParam, useQueryParams } from 'use-query-params';
import { compact, isUndefined, omitBy } from 'lodash-es';

export * from './FilterForm';
export { FilterMenuTriggerPortal as FilterMenu } from './FilterMenu';

export interface FilterMap {
  assigneeIds?: string[] | null;
  groupIds?: string[] | null;
  createdAt?: string | null;
  rootCategoryId?: string | null;
  statuses?: number[] | null;
}

// XXX: 无法区分 [] 与 ['']
const CsvParams: QueryParamConfig<string[] | undefined | null> = {
  encode: (data) => {
    if (data) {
      return data.join(',');
    }
    return data;
  },
  decode: (data) => {
    if (data === undefined || data === null) {
      return data;
    }
    if (typeof data === 'string') {
      if (data === '') {
        return [];
      }
      return data.split(',');
    } else {
      return (data.filter((s) => s) as string[]).map((s) => s.split(',')).flat();
    }
  },
};

export function useFilterParams() {
  return useQueryParams({
    assigneeId: CsvParams,
    groupId: CsvParams,
    createdAt: StringParam,
    rootCategoryId: StringParam,
    status: CsvParams,
  });
}

function decodeArray(value: (string | null)[] | null | undefined): string[] | undefined | null {
  if (value) {
    return compact(value);
  }
  return value;
}

function decodeStatus(value: (string | null)[] | null | undefined): number[] | undefined | null {
  const arr = decodeArray(value);
  if (arr) {
    return arr.map((v) => parseInt(v));
  }
  return arr;
}

function decodeFilterParams(params: ReturnType<typeof useFilterParams>[0]): FilterMap {
  return omitBy(
    {
      assigneeIds: decodeArray(params.assigneeId),
      groupIds: decodeArray(params.groupId),
      createdAt: params.createdAt,
      rootCategoryId: params.rootCategoryId,
      statuses: decodeStatus(params.status),
    },
    isUndefined
  );
}

function encodeStatus(value: number[] | undefined | null): string[] | undefined | null {
  if (value) {
    return value.map((v) => v.toString());
  }
  return value;
}

type Nullable<T> = { [k in keyof T]: T[k] | null };

export function useTempFilters() {
  const [params, setParams] = useFilterParams();

  const filters = useMemo<FilterMap>(() => decodeFilterParams(params), [params]);

  const set = useCallback(
    (filters: Nullable<FilterMap> = {}) => {
      const params: Parameters<typeof setParams>[0] = {
        assigneeId: filters.assigneeIds,
        groupId: filters.groupIds,
        createdAt: filters.createdAt,
        rootCategoryId: filters.rootCategoryId,
        status: encodeStatus(filters.statuses),
      };
      setParams(params);
    },
    [setParams]
  );

  return [filters, set] as const;
}
