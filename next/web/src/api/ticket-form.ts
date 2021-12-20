import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '@/leancloud';

export interface TicketFormSchema {
  id: string;
  title: string;
  fieldIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FetchTicketFormsOptions {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  count?: any;
}

export interface FetchTicketFormsResult {
  data: TicketFormSchema[];
  totalCount?: number;
}

export async function fetchTicketForms(
  options: FetchTicketFormsOptions
): Promise<FetchTicketFormsResult> {
  const { data, headers } = await http.get<TicketFormSchema[]>('/api/2/ticket-forms', {
    params: options,
  });
  const totalCount = headers['x-total-count'];
  return {
    data,
    totalCount: totalCount ? parseInt(totalCount) : undefined,
  };
}

export interface UseTicketFormsOptions extends FetchTicketFormsOptions {
  queryOptions?: UseQueryOptions<FetchTicketFormsResult, Error>;
}

export function useTicketForms({ queryOptions, ...options }: UseTicketFormsOptions = {}) {
  const { data, ...results } = useQuery({
    queryKey: ['ticketForms', options],
    queryFn: () => fetchTicketForms(options),
    ...queryOptions,
  });

  return {
    ...results,
    data: data?.data,
    totalCount: data?.totalCount,
  };
}

export async function fetchTicketForm(id: string) {
  const { data } = await http.get<TicketFormSchema>(`/api/2/ticket-forms/${id}`);
  return data;
}

export function useTicketForm(id: string, options?: UseQueryOptions<TicketFormSchema, Error>) {
  return useQuery({
    queryKey: ['ticketForm', id],
    queryFn: () => fetchTicketForm(id),
    ...options,
  });
}

export interface CreateTicketFormData {
  title: string;
  fieldIds: string[];
}

export async function createTicketForm(data: CreateTicketFormData) {
  await http.post('/api/2/ticket-forms', data);
}

export type UpdateTicketFormData = Partial<CreateTicketFormData>;

export async function updateTicketForm(id: string, data: UpdateTicketFormData) {
  await http.patch(`/api/2/ticket-forms/${id}`, data);
}

export async function deleteTicketForm(id: string) {
  await http.delete(`/api/2/ticket-forms/${id}`);
}
