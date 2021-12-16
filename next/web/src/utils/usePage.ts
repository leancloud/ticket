import { useCallback, useMemo } from 'react';

import { useSearchParam } from './useSearchParams';

export function usePage(key = 'page') {
  const [_page, _setPage] = useSearchParam(key);

  const page = useMemo(() => {
    if (_page === undefined) {
      return 1;
    }
    const page = parseInt(_page);
    if (Number.isNaN(page)) {
      return 1;
    }
    if (page < 1) {
      return 1;
    }
    return page;
  }, [_page]);

  const set = useCallback(
    (newPage: number) => {
      if (newPage > 0) {
        _setPage(newPage.toString());
      }
    },
    [key, _setPage]
  );

  const prev = useCallback(() => set(page - 1), [page, set]);

  const next = useCallback(() => set(page + 1), [page, set]);

  return [page, { set, prev, next }] as const;
}

export interface UsePageSizeOptions {
  key?: string;
  defaultValue?: number;
}

type PageSizeValue<TOptions extends UsePageSizeOptions> = TOptions['defaultValue'] extends number
  ? number
  : number | undefined;

export function usePageSize<TOptions extends UsePageSizeOptions>(options?: TOptions) {
  const { key = 'pageSize', defaultValue } = options || {};
  const [_pageSize, _setPageSize] = useSearchParam(key);

  const pageSize = useMemo(() => {
    if (_pageSize !== undefined) {
      const pageSize = parseInt(_pageSize);
      if (!Number.isNaN(pageSize)) {
        return pageSize;
      }
    }
    return defaultValue;
  }, [_pageSize, defaultValue]);

  const set = useCallback(
    (value: number) => {
      _setPageSize(value.toString());
    },
    [_setPageSize]
  );

  return [pageSize as PageSizeValue<TOptions>, set] as const;
}
