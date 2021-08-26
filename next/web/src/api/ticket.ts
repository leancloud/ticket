import { AxiosError } from 'axios';
import { UseQueryOptions, useQuery } from 'react-query';
import { castArray } from 'lodash-es';

import { http } from '../leancloud';

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

export interface TicketParams {
  assigneeId?: string | string[];
  groupId?: string | string[];
  createdAt?: [Date | undefined, Date | undefined];
  categoryId?: string | string[];
  status?: number | number[];
}

export interface FetchTicketsOptions extends TicketParams {
  page?: number;
  pageSize?: number;
  orderKey?: string;
  orderType?: 'asc' | 'desc';
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
  assigneeId,
  groupId,
  createdAt,
  categoryId,
  status,
}: FetchTicketsOptions = {}): Promise<FetchTicketsResult> {
  const params: any = {
    page,
    pageSize,
    count: 1,
    include: 'author,assignee,group',
    orderBy: `${orderKey}-${orderType}`,
  };

  if (assigneeId) {
    params.assigneeId = castArray(assigneeId).join(',');
  }
  if (groupId) {
    params.groupId = castArray(groupId).join(',');
  }
  if (createdAt) {
    params.createdAt = createdAt.map((date) => date?.toISOString() ?? '').join('..');
  }
  if (categoryId) {
    params.categoryId = castArray(categoryId).join(',');
  }
  if (status) {
    params.status = castArray(status).join(',');
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
