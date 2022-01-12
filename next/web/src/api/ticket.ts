import { UseQueryOptions, useQuery } from 'react-query';
import { castArray } from 'lodash-es';

import { http } from '@/leancloud';
import { decodeDateRange } from '@/utils/date-range';

export interface TicketSchema {
  id: string;
  nid: number;
  title: string;
  categoryId: string;
  author: {
    id: string;
    nickname: string;
  };
  assignee?: {
    id: string;
    nickname: string;
  };
  group?: {
    id: string;
    name: string;
  };
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface FetchTicketsOptions {
  page?: number;
  pageSize?: number;
  orderKey?: string;
  orderType?: 'asc' | 'desc';
  filters?: {
    assigneeId?: string | string[];
    groupId?: string | string[];
    createdAt?: string;
    rootCategoryId?: string;
    status?: number | number[];
  };
}

export interface FetchTicketsResult {
  tickets: TicketSchema[];
  totalCount: number;
}

export async function fetchTickets({
  page = 1,
  pageSize = 10,
  orderKey = 'createdAt',
  orderType = 'desc',
  filters,
}: FetchTicketsOptions = {}): Promise<FetchTicketsResult> {
  const params: any = {
    page,
    pageSize,
    count: 1,
    include: 'author,assignee,group',
    orderBy: `${orderKey}-${orderType}`,
  };

  if (filters) {
    if (filters.assigneeId) {
      params.assigneeId = castArray(filters.assigneeId).join(',');
    }
    if (filters.groupId) {
      params.groupId = castArray(filters.groupId).join(',');
    }
    if (filters.createdAt) {
      const dateRange = decodeDateRange(filters.createdAt);
      if (dateRange && (dateRange.from || dateRange.to)) {
        // "2021-08-01..2021-08-31", "2021-08-01..*", etc.
        params.createdAt = [
          dateRange.from?.toISOString() ?? '*',
          dateRange.to?.toISOString() ?? '*',
        ].join('..');
      }
    }
    if (filters.rootCategoryId) {
      params.rootCategoryId = filters.rootCategoryId;
    }
    if (filters.status) {
      params.status = castArray(filters.status).join(',');
    }
  }

  const { headers, data } = await http.get<TicketSchema[]>('/api/2/tickets', { params });
  return { tickets: data, totalCount: parseInt(headers['x-total-count']) };
}

export interface UseTicketsOptions extends FetchTicketsOptions {
  queryOptions?: UseQueryOptions<FetchTicketsResult, Error>;
}

export function useTickets({ queryOptions, ...options }: UseTicketsOptions = {}) {
  const { data, ...rest } = useQuery({
    queryKey: ['tickets', options],
    queryFn: () => fetchTickets(options),
    ...queryOptions,
  });

  return {
    ...rest,
    data: data?.tickets,
    totalCount: data?.totalCount,
  };
}
