import { useMemo } from 'react';
import { useLocalFilters } from './useTicketFilter';

export const useSorterLimited = () => {
  const [filters] = useLocalFilters();

  const res = useMemo(() => filters.type !== 'normal', [filters.type]);

  return res;
};
