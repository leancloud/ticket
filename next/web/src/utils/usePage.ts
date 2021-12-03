import { useCallback, useMemo } from 'react';

import { useSearchParams } from './useSearchParams';

export interface UsePageOptions {
  key?: string;
}

export function usePage({ key = 'page' }: UsePageOptions = {}) {
  const [params, { merge }] = useSearchParams();
  const pageParam = params[key];

  const page = useMemo(() => {
    if (pageParam === undefined) {
      return 1;
    }
    const page = parseInt(pageParam);
    if (Number.isNaN(page)) {
      return 1;
    }
    if (page < 1) {
      return 1;
    }
    return page;
  }, [pageParam]);

  const set = useCallback(
    (newPage: number) => {
      if (newPage > 0) {
        merge({ [key]: newPage.toString() });
      }
    },
    [key, merge]
  );

  const prev = useCallback(() => set(page - 1), [page, set]);

  const next = useCallback(() => set(page + 1), [page, set]);

  return [page, { set, prev, next }] as const;
}
