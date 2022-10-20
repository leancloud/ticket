import { UseQueryOptions, useQuery, UseMutationOptions, useMutation } from 'react-query';
import { http } from '@/leancloud';

interface TicketFormItem {
  type: 'field' | 'note';
  id: string;
}

export interface TicketFormSchema {
  id: string;
  title: string;
  fieldIds: string[];
  items: TicketFormItem[];
  createdAt: string;
  updatedAt: string;
}

interface FetchTicketFormsOptions {
  page?: number;
  pageSize?: number;
  orderBy?: string;
}

interface FetchTicketFormsResult {
  items: TicketFormSchema[];
  totalCount: number;
}

async function fetchTicketForms(options: FetchTicketFormsOptions) {
  const { data, headers } = await http.get<TicketFormSchema[]>('/api/2/ticket-forms', {
    params: options,
  });
  return {
    items: data,
    totalCount: parseInt(headers['x-total-count']),
  };
}

async function fetchTicketForm(id: string) {
  const { data } = await http.get<TicketFormSchema>(`/api/2/ticket-forms/${id}`);
  return data;
}

interface CreateTicketFormData {
  title: string;
  fieldIds?: string[];
  items?: TicketFormItem[];
}

async function createTicketForm(data: CreateTicketFormData) {
  const res = await http.post<TicketFormSchema>('/api/2/ticket-forms', data);
  return res.data;
}

type UpdateTicketFormData = Partial<CreateTicketFormData>;

export async function updateTicketForm(id: string, data: UpdateTicketFormData) {
  const res = await http.patch<TicketFormSchema>(`/api/2/ticket-forms/${id}`, data);
  return res.data;
}

async function deleteTicketForm(id: string) {
  await http.delete(`/api/2/ticket-forms/${id}`);
}

export interface UseTicketFormsOptions extends FetchTicketFormsOptions {
  queryOptions?: UseQueryOptions<FetchTicketFormsResult, Error>;
}

export function useTicketForms({ queryOptions, ...options }: UseTicketFormsOptions = {}) {
  return useQuery({
    queryKey: ['ticketForms', options],
    queryFn: () => fetchTicketForms(options),
    ...queryOptions,
  });
}

export function useTicketForm(id: string, options?: UseQueryOptions<TicketFormSchema, Error>) {
  return useQuery({
    queryKey: ['ticketForm', id],
    queryFn: () => fetchTicketForm(id),
    ...options,
  });
}

export function useCreateTicketForm(
  options?: UseMutationOptions<TicketFormSchema, Error, CreateTicketFormData>
) {
  return useMutation({
    mutationFn: createTicketForm,
    ...options,
  });
}

export function useUpdateTicketForm(
  options?: UseMutationOptions<TicketFormSchema, Error, Parameters<typeof updateTicketForm>>
) {
  return useMutation({
    mutationFn: (args) => updateTicketForm.apply(null, args),
    ...options,
  });
}

export function useDeleteTicketForm(options?: UseMutationOptions<void, Error, string>) {
  return useMutation({
    mutationFn: deleteTicketForm,
    ...options,
  });
}
