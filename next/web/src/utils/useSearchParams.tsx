import { useCallback, useMemo } from 'react';
import { NavigateOptions, useLocation, useNavigate } from 'react-router-dom';
import { parse, stringify } from 'query-string';
import { StringParam, useQueryParam } from 'use-query-params';

/**
 * @deprecated
 */
export function useSearchParams() {
  const { search } = useLocation();
  const navigate = useNavigate();

  const params = useMemo<Record<string, string | undefined>>(() => {
    const rawParams = parse(search);
    const stringEntries = Object.entries(rawParams)
      .map((entry) => {
        if (Array.isArray(entry[1])) {
          const [key, value] = entry;
          return [key, value[value.length - 1]];
        }
        return entry as [string, string | null];
      })
      .filter(([, value]) => typeof value === 'string') as [string, string][];
    return Object.fromEntries(stringEntries);
  }, [search]);

  const set = useCallback(
    (newParams: Record<string, any>, options?: NavigateOptions) => {
      navigate({ search: stringify(newParams) }, options);
    },
    [navigate]
  );

  const merge = useCallback(
    (newParams: Record<string, any>, options?: NavigateOptions) => {
      set({ ...params, ...newParams }, options);
    },
    [params, set]
  );

  return [params, { set, merge }] as const;
}

/**
 * @deprecated
 */
export function useSearchParam(name: string) {
  const [param, setParam] = useQueryParam(name, StringParam);
  const set = useCallback(
    (newValue?: string, options?: { replace: boolean }) => {
      setParam(newValue, options?.replace ? 'replaceIn' : undefined);
    },
    [setParam]
  );
  return [param ?? undefined, set] as const;
}
