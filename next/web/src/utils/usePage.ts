import { useCallback, useMemo } from 'react';

import { useSearchParam } from './useSearchParams';

function useIntSearchParam(key: string) {
  const [param, setParam] = useSearchParam(key);

  const intParam = useMemo(() => {
    if (param !== undefined) {
      const intParam = parseInt(param);
      if (!Number.isNaN(intParam)) {
        return intParam;
      }
    }
  }, [param]);

  const set = useCallback(
    (value: number) => {
      setParam(Math.floor(value).toString());
    },
    [setParam]
  );

  return [intParam, set] as const;
}

export function usePage() {
  const [_page, _setPage] = useIntSearchParam('page');

  const page = useMemo(() => {
    if (_page === undefined || _page < 1) {
      return 1;
    }
    return _page;
  }, [_page]);

  const set = useCallback(
    (newPage: number) => {
      if (newPage > 0) {
        _setPage(newPage);
      }
    },
    [_setPage]
  );

  const prev = useCallback(() => set(page - 1), [page, set]);

  const next = useCallback(() => set(page + 1), [page, set]);

  return [page, { set, prev, next }] as const;
}

export function usePageSize() {
  const [_pageSize, _setPageSize] = useIntSearchParam('pageSize');

  const pageSize = useMemo(() => {
    if (_pageSize !== undefined && _pageSize > 0) {
      return _pageSize;
    }
  }, [_pageSize]);

  const set = useCallback(
    (value: number) => {
      if (value > 0) {
        _setPageSize(value);
      }
    },
    [_setPageSize]
  );

  return [pageSize, set] as const;
}
