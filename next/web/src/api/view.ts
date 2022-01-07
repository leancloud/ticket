import { useQuery, UseQueryOptions } from 'react-query';

import { http } from '@/leancloud';
import { GroupSchema } from './group';

interface ConditionSchema {
  type: string;
  op: string;
  value: any;
}

export interface ViewSchema {
  id: string;
  title: string;
  userIds?: string[];
  groupIds?: string[];
  conditions: {
    all: ConditionSchema[];
    any: ConditionSchema[];
  };
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
  conditions: {
    all: ConditionSchema[];
    any: ConditionSchema[];
  };
  fields: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function createView(data: CreateViewData) {
  await http.post('/api/2/views', data);
}

export type UpdateViewData = Partial<CreateViewData>;

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
      const sorted = views.sort(viewSortFunction);
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
