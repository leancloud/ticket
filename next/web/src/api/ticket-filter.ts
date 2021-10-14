import { AxiosError } from 'axios';
import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from 'react-query';
import { castArray } from 'lodash-es';

import { http } from 'leancloud';

export interface TicketFilterSchema {
  id: string;
  name: string;
  userIds?: string[];
  groupIds?: string[];
  filters: {
    assigneeIds?: string[];
    groupIds?: string[];
    createdAt?: string;
    rootCategoryId?: string;
    statuses?: number[];
  };
}

export interface FetchTicketFiltersOptions {
  userId?: string | string[];
  groupId?: string | string[];
}

export async function fetchTicketFilters(options?: FetchTicketFiltersOptions) {
  const params: any = {};
  if (options?.userId) {
    params.userId = castArray(options.userId).join(',');
  }
  if (options?.groupId) {
    params.groupId = castArray(options.groupId).join(',');
  }
  const { data } = await http.get<TicketFilterSchema[]>('/api/2/ticket-filters', { params });
  return data;
}

export async function fetchTicketFilter(id: string) {
  const { data } = await http.get<TicketFilterSchema>('/api/2/ticket-filters/' + id);
  return data;
}

export type CreateTicketFilterData = Pick<
  TicketFilterSchema,
  'name' | 'userIds' | 'groupIds' | 'filters'
>;

export async function createTicketFilter(
  filter: CreateTicketFilterData
): Promise<TicketFilterSchema> {
  const { data } = await http.post<any>('/api/2/ticket-filters', filter);
  return data;
}

export interface UpdateTicketFilterData {
  name?: string;
  userIds?: string[] | null;
  groupIds?: string[] | null;
  filters?: TicketFilterSchema['filters'];
}

export async function updateTicketFilter(id: string, data: UpdateTicketFilterData): Promise<void> {
  await http.patch(`/api/2/ticket-filters/${id}`, data);
}

export async function deleteTicketFilter(id: string): Promise<void> {
  await http.delete('/api/2/ticket-filters/' + id);
}

export interface UseTicketFiltersOptions extends FetchTicketFiltersOptions {
  queryOptions?: UseQueryOptions<TicketFilterSchema[], AxiosError>;
}

export function useTicketFilters({ queryOptions, ...options }: UseTicketFiltersOptions = {}) {
  const client = useQueryClient();
  return useQuery({
    queryKey: ['ticketFilters', options],
    queryFn: () => fetchTicketFilters(options),
    ...queryOptions,
    onSuccess: (data) => {
      data.forEach((filter) => client.setQueryData(['ticketFilter', filter.id], filter));
      queryOptions?.onSuccess?.(data);
    },
  });
}

export interface UseTicketFilterOptions {
  queryOptions?: UseQueryOptions<TicketFilterSchema, AxiosError>;
}

export function useTicketFilter(id: string, { queryOptions }: UseTicketFilterOptions = {}) {
  return useQuery({
    queryKey: ['ticketFilter', id],
    queryFn: () => fetchTicketFilter(id),
    ...queryOptions,
  });
}

export function useCreateTicketFilter(
  options?: UseMutationOptions<TicketFilterSchema, AxiosError, CreateTicketFilterData>
) {
  return useMutation({
    mutationFn: createTicketFilter,
    ...options,
  });
}

export function useUpdateTicketFilter(
  options?: UseMutationOptions<void, AxiosError, UpdateTicketFilterData & { id: string }>
) {
  return useMutation({
    mutationFn: ({ id, ...data }) => updateTicketFilter(id, data),
    ...options,
  });
}

export function useDeleteTicketFilter(options?: UseMutationOptions<void, AxiosError, string>) {
  return useMutation({
    mutationFn: deleteTicketFilter,
    ...options,
  });
}
