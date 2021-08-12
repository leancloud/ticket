import { useQuery, UseQueryOptions } from 'react-query';

export interface TicketFilter {
  id: string;
  name: string;
  filters: {
    assigneeIds?: string[];
    groupIds?: string[];
    createdAt?: string;
    categoryId?: string;
    status?: number[];
  };
}

export const bulitInFilters: Record<string, TicketFilter> = {
  'all-tickets': {
    id: 'all-tickets',
    name: '所有工单',
    filters: {
      createdAt: '30d',
    },
  },
};

export async function fetchTicketFilter(id: string): Promise<TicketFilter> {
  if (id in bulitInFilters) {
    return bulitInFilters[id];
  }
  throw new Error('404');
}

export function useTicketFilter(id: string, options?: UseQueryOptions<TicketFilter, Error>) {
  return useQuery({
    queryKey: ['ticketFilter', id],
    queryFn: () => fetchTicketFilter(id),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}
