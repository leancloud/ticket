import { useQuery, UseQueryOptions } from 'react-query';

import { http } from '@/leancloud';
import { GroupSchema } from './group';
import { TicketSchema } from './ticket';

export type Condition =
  | {
      type: 'all' | 'any';
      conditions: Condition[];
    }
  | {
      type: 'unknown';
    };

export interface ViewSchema {
  id: string;
  title: string;
  userIds?: string[];
  groupIds?: string[];
  conditions: Condition;
  fields: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateViewData {
  title: string;
  userIds?: string[];
  groupIds?: string[];
  conditions: Condition;
  fields: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function createView(data: CreateViewData) {
  await http.post('/api/2/views', data);
}

export interface UpdateViewData extends Partial<Omit<CreateViewData, 'userIds' | 'groupIds'>> {
  userIds?: string[] | null;
  groupIds?: string[] | null;
}

export async function updateView(id: string, data: UpdateViewData) {
  await http.patch(`/api/2/views/${id}`, data);
}

export async function deleteView(id: string) {
  await http.delete(`/api/2/views/${id}`);
}

export async function reorderViews(ids: string[]) {
  await http.post('/api/2/views/reorder', { ids });
}

export interface FetchViewsOptions {
  userIds?: string[];
  groupIds?: string[];
}

export async function fetchViews({ userIds, groupIds }: FetchViewsOptions): Promise<ViewSchema[]> {
  const { data } = await http.get('/api/2/views', {
    params: {
      userIds: userIds?.join(','),
      groupIds: groupIds?.join(','),
    },
  });
  return data;
}

async function fetchViewGroups(): Promise<GroupSchema[]> {
  const { data } = await http.get('/api/2/views/groups');
  return data;
}

async function fetchView(id: string): Promise<ViewSchema> {
  const { data } = await http.get(`/api/2/views/${id}`);
  return data;
}

interface FetchViewTicketsOptions {
  page?: number;
  pageSize?: number;
  count?: string | boolean | number;
  include?: string;
}

interface FetchViewTicketsResult {
  tickets: TicketSchema[];
  totalCount?: number;
}

async function fetchViewTickets(
  id: string,
  options: FetchViewTicketsOptions = {}
): Promise<FetchViewTicketsResult> {
  const { data, headers } = await http.get(`/api/2/views/${id}/tickets`, {
    params: options,
  });

  let totalCount: number | undefined;
  if (headers['x-total-count']) {
    totalCount = parseInt(headers['x-total-count']);
  }

  return { tickets: data, totalCount };
}

export interface ViewTicketCountResult {
  viewId: string;
  ticketCount: number;
}

async function fetchViewTicketCounts(viewIds: string[]): Promise<ViewTicketCountResult[]> {
  const { data } = await http.get('/api/2/views/count', {
    params: {
      ids: viewIds.join(','),
    },
  });
  return data;
}

function viewSortFunction(a: ViewSchema, b: ViewSchema): number {
  if (a.position === b.position) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
  return a.position - b.position;
}

export interface UseViewsOptions extends FetchViewsOptions {
  queryOptions?: UseQueryOptions<ViewSchema[]>;
}

export function useViews({ queryOptions, ...options }: UseViewsOptions = {}) {
  return useQuery({
    queryKey: ['views', options],
    queryFn: () => fetchViews(options),
    staleTime: Infinity,
    select: (views) => {
      const sorted = views.slice().sort(viewSortFunction);
      if (queryOptions?.select) {
        return queryOptions.select(sorted);
      }
      return sorted;
    },
    ...queryOptions,
  });
}

export function useViewGroups(options?: UseQueryOptions<GroupSchema[]>) {
  return useQuery({
    queryKey: ['viewGroups'],
    queryFn: fetchViewGroups,
    staleTime: Infinity,
    ...options,
  });
}

export function useView(id: string, options?: UseQueryOptions<ViewSchema>) {
  return useQuery({
    queryKey: ['view', id],
    queryFn: () => fetchView(id),
    staleTime: Infinity,
    ...options,
  });
}

interface UseViewTicketsOptions extends FetchViewTicketsOptions {
  queryOptions?: UseQueryOptions<FetchViewTicketsResult, Error>;
}

export function useViewTickets(
  id: string,
  { queryOptions, ...options }: UseViewTicketsOptions = {}
) {
  const { data, ...result } = useQuery({
    queryKey: ['viewTickets', id, options],
    queryFn: () => fetchViewTickets(id, options),
    ...queryOptions,
  });
  return {
    ...result,
    data: data?.tickets,
    totalCount: data?.totalCount,
  };
}

export function useViewTicketCounts(
  viewIds: string[],
  options?: UseQueryOptions<ViewTicketCountResult[]>
) {
  return useQuery({
    queryKey: ['viewTicketCounts', viewIds],
    queryFn: () => fetchViewTicketCounts(viewIds),
    staleTime: Infinity,
    ...options,
  });
}
