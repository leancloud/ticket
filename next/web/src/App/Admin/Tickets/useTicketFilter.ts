import { useMemo } from 'react';

import { TicketFilterSchema, useTicketFilter as _useTicketFilter } from 'api/ticket-filter';

export const presetFilters: TicketFilterSchema[] = [
  {
    id: '',
    name: '所有工单',
    filters: {},
  },
  {
    id: 'unResolvedTickets',
    name: '所有未解决的工单',
    filters: {
      statuses: [50, 120, 160],
    },
  },
];

export interface UseTicketFilterResult {
  filter?: TicketFilterSchema;
  isLoading: boolean;
  isPresetFilter: boolean;
}

export function useTicketFilter(id?: string | null): UseTicketFilterResult {
  const presetFilter = useMemo(() => {
    if (!id) {
      return presetFilters[0];
    }
    return presetFilters.find((f) => f.id === id);
  }, [id]);

  const { data, isLoading } = _useTicketFilter(id!, {
    queryOptions: {
      enabled: !!id && !presetFilter,
      keepPreviousData: true,
      staleTime: Infinity,
    },
  });

  return {
    filter: presetFilter ?? data,
    isLoading,
    isPresetFilter: !!presetFilter,
  };
}
