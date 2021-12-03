import { useCallback, useMemo } from 'react';

import { useSearchParam } from './useSearchParams';

export type OrderType = 'asc' | 'desc';

export interface UseOrderByOptions {
  key?: string;
  defaultOrderKey: string;
  defaultOrderType: OrderType;
}

export function useOrderBy({
  key = 'orderBy',
  defaultOrderKey,
  defaultOrderType,
}: UseOrderByOptions) {
  const [orderBy, setOrderBy] = useSearchParam(key);

  const [orderKey, orderType] = useMemo<[string, OrderType]>(() => {
    if (!orderBy) {
      return [defaultOrderKey, defaultOrderType];
    }
    if (orderBy.endsWith('-asc')) {
      return [orderBy.slice(0, -4), 'asc'];
    }
    if (orderBy.endsWith('-desc')) {
      return [orderBy.slice(0, -5), 'desc'];
    }
    return [orderBy, defaultOrderType];
  }, [orderBy, defaultOrderKey, defaultOrderType]);

  const set = useCallback(
    (orderKey: string, orderType: OrderType) => {
      if (orderKey === defaultOrderKey && orderType === defaultOrderType) {
        setOrderBy(undefined);
      } else if (orderType === defaultOrderType) {
        setOrderBy(orderKey);
      } else {
        setOrderBy(orderKey + '-' + orderType);
      }
    },
    [defaultOrderKey, defaultOrderType, setOrderBy]
  );

  const setOrderKey = useCallback(
    (orderKey: string) => {
      set(orderKey, orderType);
    },
    [orderType, set]
  );

  const setOrderType = useCallback(
    (orderType: OrderType) => {
      set(orderKey, orderType);
    },
    [orderKey, set]
  );

  return { orderKey, orderType, setOrderKey, setOrderType };
}
