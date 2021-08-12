import { AxiosError } from 'axios';
import { UseQueryOptions, useQuery, UseQueryResult } from 'react-query';

import { http } from '../leancloud';

export interface TicketItem {
  id: string;
  nid: number;
  title: string;
  categoryId: string;
  status: number;
  author: {
    id: string;
    username: string;
    nickname: string;
    avatarUrl: string;
  };
  assignee?: {
    id: string;
    username: string;
    nickname: string;
    avatarUrl: string;
  };
  group?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FetchTicketsOptions {
  page?: string | number;
  pageSize?: number;
  orderKey?: string;
  orderType?: 'asc' | 'desc';
  params?: Record<string, string | number | boolean | undefined>;
}

export interface FetchTicketsResult {
  tickets: TicketItem[];
  totalCount: number;
}

export async function fetchTickets({
  page = 1,
  pageSize = 10,
  orderKey = 'createdAt',
  orderType = 'desc',
  params,
}: FetchTicketsOptions): Promise<FetchTicketsResult> {
  const { headers, data } = await http.get('/api/2/tickets', {
    params: {
      ...params,
      page,
      pageSize,
      count: 1,
      include: 'author,assignee,group',
      orderBy: orderKey + '-' + orderType,
    },
  });
  return { tickets: data, totalCount: parseInt(headers['x-total-count']) };
}

export interface UseTicketsOptions extends FetchTicketsOptions {
  queryOptions?: UseQueryOptions<FetchTicketsResult, AxiosError<FetchTicketsResult>>;
}

export type UseTicketsResult = UseQueryResult<TicketItem[], AxiosError> & {
  totalCount?: number;
};

export function useTickets({ queryOptions, ...fetchOptions }: UseTicketsOptions = {}) {
  const { data, ...result } = useQuery<FetchTicketsResult, AxiosError>({
    queryKey: ['tickets', fetchOptions],
    queryFn: () => fetchTickets(fetchOptions),
    ...queryOptions,
  });
  return {
    ...result,
    data: data?.tickets,
    totalCount: data?.totalCount,
  } as UseTicketsResult;
}
