import { AxiosError } from 'axios';
import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from 'react-query';

import { http } from 'leancloud';

export interface TicketFilterSchema {
  id: string;
  name: string;
  userId?: string;
  groupId?: string;
  filters: {
    assigneeIds?: string[];
    groupIds?: string[];
    createdAt?: string;
    rootCategoryId?: string;
    statuses?: number[];
  };
}

export interface FetchTicketFiltersOptions {
  userId?: string;
  groupId?: string;
}

export async function fetchTicketFilters(
  options?: FetchTicketFiltersOptions
): Promise<TicketFilterSchema[]> {
  const { data } = await http.get('/api/2/ticket-filters', {
    params: {
      userId: options?.userId,
      groupId: options?.groupId,
    },
  });
  return data;
}

export async function fetchTicketFilter(id: string): Promise<TicketFilterSchema> {
  const { data } = await http.get('/api/2/ticket-filters/' + id);
  return data;
}

export type CreateTicketFilterData = Pick<
  TicketFilterSchema,
  'name' | 'userId' | 'groupId' | 'filters'
>;

export async function createTicketFilter(
  filter: CreateTicketFilterData
): Promise<TicketFilterSchema> {
  const { data } = await http.post('/api/2/ticket-filters', filter);
  return data;
}

export interface UpdateTicketFilterData {
  name?: string;
  userId?: string | null;
  groupId?: string | null;
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
