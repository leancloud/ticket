import { AxiosError } from 'axios';
import { UseQueryOptions, useQuery } from 'react-query';

import { http } from 'leancloud';
import { decodeDateRange } from 'utils/date-range';

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
    assigneeIds?: string[];
    groupIds?: string[];
    createdAt?: string;
    rootCategoryId?: string;
    statuses?: number[];
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
    if (filters.assigneeIds) {
      params.assigneeId = filters.assigneeIds.join(',');
    }
    if (filters.groupIds) {
      params.groupId = filters.groupIds.join(',');
    }
    if (filters.createdAt) {
      const dateRange = decodeDateRange(filters.createdAt);
      if (dateRange && (dateRange.from || dateRange.to)) {
        // "2021-08-01..2021-08-31", "2021-08-01..*", etc.
        params.createdAt = [dateRange.from ?? '*', dateRange.to ?? '*'].join('..');
      }
    }
    if (filters.rootCategoryId) {
      params.rootCategoryId = filters.rootCategoryId;
    }
    if (filters.statuses) {
      params.status = filters.statuses.join(',');
    }
  }

  const { headers, data } = await http.get('/api/2/tickets', { params });
  return { tickets: data, totalCount: parseInt(headers['x-total-count']) };
}

export interface UseTicketsOptions extends FetchTicketsOptions {
  queryOptions?: UseQueryOptions<FetchTicketsResult, AxiosError>;
}

export function useTickets({ queryOptions, ...options }: UseTicketsOptions = {}) {
  return useQuery({
    queryKey: ['tickets', options],
    queryFn: () => fetchTickets(options),
    ...queryOptions,
  });
}
