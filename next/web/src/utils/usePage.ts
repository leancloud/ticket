import { useCallback, useMemo } from 'react';
import { NumberParam, useQueryParam } from 'use-query-params';

export function usePage() {
  const [_page, _setPage] = useQueryParam('page', NumberParam);

  const page = useMemo(() => {
    if (Number.isInteger(_page) && (_page as number) > 0) {
      return _page as number;
    }
    return 1;
  }, [_page]);

  const setPage = useCallback((page: number) => _setPage(page), [_setPage]);

  return [page, { set: setPage }] as const;
}

export function usePageSize() {
  const [_pageSize, _setPageSize] = useQueryParam('pageSize', NumberParam);

  const pageSize = useMemo(() => {
    if (Number.isInteger(_pageSize) && (_pageSize as number) > 0) {
      return _pageSize as number;
    }
  }, [_pageSize]);

  const setPageSize = useCallback((size: number) => _setPageSize(size), [_setPageSize]);

  return [pageSize, setPageSize] as const;
}
