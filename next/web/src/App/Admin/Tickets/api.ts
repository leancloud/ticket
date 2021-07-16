import { useQuery } from 'react-query';

import { http } from '../../../leancloud';

export interface Ticket {
  id: string;
  nid: number;
  title: string;
  status: number;
  author: {
    id: string;
    username: string;
    name?: string;
    avatar: string;
  };
  assignee: {
    id: string;
    username: string;
    name?: string;
    avatar: string;
  };
  category: {
    id: string;
    name: string;
  };
  categoryPath: {
    id: string;
    name: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface FetchTicketsResult {
  tickets: Ticket[];
  totalCount: number;
}

export async function fetchTickets(
  page?: string | number,
  params?: any
): Promise<FetchTicketsResult> {
  const { data } = await http.get('/api/2/tickets', {
    params: {
      ...params,
      page,
      pageSize: 20,
      count: 1,
    },
  });
  return { tickets: data.items, totalCount: data.totalCount };
}

export interface UseTicketsOptions {
  page?: number | string;
  params?: any;
}

export function useTickets({ page = 1, params }: UseTicketsOptions = {}) {
  const result = useQuery({
    queryKey: ['tickets', { page, params }],
    queryFn: () => fetchTickets(page, params),
  });
  return result;
}
