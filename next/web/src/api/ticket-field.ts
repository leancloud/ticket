import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '@/leancloud';

type TicketFieldType = 'text' | 'multi-line' | 'dropdown' | 'multi-select' | 'radios' | 'file';

export interface TicketFieldVariantSchema {
  locale: string;
  title: string;
  titleForCustomerService: string;
  description: string;
  options?: { title: string; value: string }[];
}

export interface TicketFieldSchema {
  id: string;
  type: TicketFieldType;
  title: string;
  defaultLocale: string;
  meta?: Record<string, any>;
  active: boolean;
  visible: boolean;
  required: boolean;
  variants?: TicketFieldVariantSchema[];
  createdAt: string;
  updatedAt: string;
}

export interface FetchTicketFieldsOptions {
  page?: number;
  pageSize?: number;
  active?: boolean;
  orderBy?: string;
  count?: number | boolean | string;
  includeVariants?: boolean;
}

export interface FetchTicketFieldsResult {
  data: TicketFieldSchema[];
  totalCount?: number;
}

export async function fetchTicketFields(
  options: FetchTicketFieldsOptions
): Promise<FetchTicketFieldsResult> {
  const { data, headers } = await http.get<TicketFieldSchema[]>('/api/2/ticket-fields', {
    params: options,
  });
  const totalCount = headers['x-total-count'];
  return {
    data,
    totalCount: totalCount ? parseInt(totalCount) : undefined,
  };
}

export interface UseTicketFieldsOptions extends FetchTicketFieldsOptions {
  queryOptions?: UseQueryOptions<FetchTicketFieldsResult, Error>;
}

export function useTicketFields({ queryOptions, ...options }: UseTicketFieldsOptions = {}) {
  const { data, ...rest } = useQuery({
    queryKey: ['ticketFields', options],
    queryFn: () => fetchTicketFields(options),
    ...queryOptions,
  });

  return {
    ...rest,
    data: data?.data,
    totalCount: data?.totalCount,
  };
}

export async function fetchTicketField(id: string) {
  const { data } = await http.get<TicketFieldSchema>(`/api/2/ticket-fields/${id}`);
  return data;
}

export function useTicketField(id: string, options?: UseQueryOptions<TicketFieldSchema, Error>) {
  return useQuery({
    queryKey: ['ticketField', id],
    queryFn: () => fetchTicketField(id),
    ...options,
  });
}

export interface CreateTicketFieldData {
  type: TicketFieldType;
  title: string;
  defaultLocale: string;
  meta?: Record<string, any>;
  required: boolean;
  visible: boolean;
  variants: TicketFieldVariantSchema[];
}

export async function createTicketField(data: CreateTicketFieldData) {
  await http.post('/api/2/ticket-fields', data);
}

export interface UpdateTicketFieldData extends Partial<Omit<CreateTicketFieldData, 'type'>> {
  active?: boolean;
}

export async function updateTicketField(fieldId: string, data: UpdateTicketFieldData) {
  await http.patch(`/api/2/ticket-fields/${fieldId}`, data);
}
