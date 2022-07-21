import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
} from 'react-query';
import { castArray, last } from 'lodash-es';

import { http } from '@/leancloud';
import { decodeDateRange } from '@/utils/date-range';
import { UserSchema } from './user';
import { GroupSchema } from './group';
import { FileSchema } from './file';
import { ReplySchema } from './reply';

export interface TicketSchema {
  id: string;
  nid: number;
  title: string;
  categoryId: string;
  authorId: string;
  assigneeId?: string;
  groupId?: string;
  status: number;
  evaluation?: { star: number; content: string };
  metaData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetailSchema extends TicketSchema {
  contentSafeHTML: string;
  author?: UserSchema;
  assignee?: UserSchema;
  group?: GroupSchema;
  files?: FileSchema[];
}

export interface FetchTicketFilters {
  authorId?: string;
  assigneeId?: string | string[];
  groupId?: string | string[];
  rootCategoryId?: string;
  star?: number;
  createdAt?: string;
  status?: number | number[];
  tagKey?: string;
  tagValue?: string;
  privateTagKey?: string;
  privateTagValue?: string;
}

export function encodeTicketFilters(filters: FetchTicketFilters) {
  const params: any = {
    authorId: filters.authorId,
    rootCategoryId: filters.rootCategoryId,
    'evaluation.star': filters.star,
    tagKey: filters.tagKey,
    tagValue: filters.tagValue,
    privateTagKey: filters.privateTagKey,
    privateTagValue: filters.privateTagValue,
  };
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
  if (filters.status) {
    params.status = castArray(filters.status).join(',');
  }
  return params;
}

interface FetchTicketsOptions {
  page?: number;
  pageSize?: number;
  orderKey?: string;
  orderType?: 'asc' | 'desc';
  filters?: FetchTicketFilters;
}

interface FetchTicketsResult {
  tickets: TicketSchema[];
  totalCount: number;
}

async function fetchTickets({
  page = 1,
  pageSize = 10,
  orderKey = 'createdAt',
  orderType = 'desc',
  filters = {},
}: FetchTicketsOptions = {}): Promise<FetchTicketsResult> {
  const params: any = {
    ...encodeTicketFilters(filters),
    page,
    pageSize,
    count: 1,
    orderBy: `${orderKey}-${orderType}`,
  };

  const { headers, data } = await http.get('/api/2/tickets', { params });
  return { tickets: data, totalCount: parseInt(headers['x-total-count']) };
}

async function searchTickets(
  keyword: string,
  {
    page = 1,
    pageSize = 10,
    orderKey = 'createdAt',
    orderType = 'desc',
    filters = {},
  }: FetchTicketsOptions = {}
) {
  const params: any = {
    ...encodeTicketFilters(filters),
    keyword,
    page,
    pageSize,
    orderBy: `${orderKey}-${orderType}`,
  };

  const { headers, data } = await http.get('/api/2/tickets/search', { params });
  return { tickets: data, totalCount: parseInt(headers['x-total-count']) };
}

interface FetchTicketOptions {
  include?: ('author' | 'assignee' | 'group' | 'files')[];
}

async function fetchTicket(
  id: string,
  { include }: FetchTicketOptions = {}
): Promise<TicketDetailSchema> {
  const { data } = await http.get(`/api/2/tickets/${id}`, {
    params: {
      include: include?.join(','),
    },
  });
  return data;
}

async function fetchTicketReplies(id: string, cursor?: string): Promise<ReplySchema[]> {
  const { data } = await http.get(`/api/2/tickets/${id}/replies`, {
    params: {
      cursor,
    },
  });
  return data;
}

export interface CreateTicketData {
  appId?: string;
  categoryId: string;
  organizationId?: string;
  title: string;
  content: string;
  fileIds?: string[];
  customFields?: { field: string; value: unknown }[];
}

async function createTicket(data: CreateTicketData) {
  await http.post('/api/2/tickets', data);
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

export function useSearchTickets(
  keyword: string,
  { queryOptions, ...options }: UseTicketsOptions = {}
) {
  const { data, ...rest } = useQuery({
    queryKey: ['searchTicketsResult', keyword, options],
    queryFn: () => searchTickets(keyword, options),
    ...queryOptions,
  });

  return {
    ...rest,
    data: data?.tickets,
    totalCount: data?.totalCount,
  };
}

export interface UseTicketOptions extends FetchTicketOptions {
  queryOptions?: UseQueryOptions<TicketDetailSchema, Error>;
}

export const useTicket = (id: string, { queryOptions, ...options }: UseTicketOptions = {}) =>
  useQuery({
    queryKey: ['ticket', id, options],
    queryFn: () => fetchTicket(id, options),
    ...queryOptions,
  });

export const useTicketReplies = (
  id: string,
  options?: UseInfiniteQueryOptions<ReplySchema[], Error>
) =>
  useInfiniteQuery({
    queryKey: ['ticketReplies', id],
    queryFn: ({ pageParam }) => fetchTicketReplies(id, pageParam),
    getNextPageParam: (lastPage) => last(lastPage)?.createdAt,
    ...options,
  });

export function useCreateTicket(options?: UseMutationOptions<void, Error, CreateTicketData>) {
  return useMutation({
    mutationFn: createTicket,
    ...options,
  });
}

export type SearchTicketResult = Omit<TicketSchema, 'author' | 'assignee' | 'group'>;

async function searchTicketCustomField(q: string): Promise<SearchTicketResult[]> {
  const { data } = await http.post('/api/2/tickets/search-custom-field', { q });
  return data;
}

export function useSearchTicketCustomField(
  q: string,
  options?: UseQueryOptions<SearchTicketResult[], Error>
) {
  return useQuery({
    queryKey: ['searchTicketCustomField', q],
    queryFn: () => searchTicketCustomField(q),
    ...options,
  });
}
