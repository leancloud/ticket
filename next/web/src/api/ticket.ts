import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from 'react-query';
import { castArray, isEmpty } from 'lodash-es';

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
  reporterId?: string;
  assigneeId?: string;
  groupId?: string;
  status: number;
  evaluation?: { star: number; content: string };
  metaData?: Record<string, any>;
  language?: string;
  fields?: {
    id: string;
    value: string | string[];
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetailSchema extends TicketSchema {
  content: string;
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
  reporterId?: string | string[];
  participantId?: string | string[];
  language?: string[];
  rootCategoryId?: string;
  star?: number;
  'evaluation.ts'?: string;
  createdAt?: string;
  status?: number | number[];
  tagKey?: string;
  tagValue?: string;
  privateTagKey?: string;
  privateTagValue?: string;
  fieldName?: string;
  fieldValue?: string;
  where?: Record<string, any>;
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
    fieldName: filters.fieldName,
    fieldValue: filters.fieldValue,
  };
  if (filters.assigneeId) {
    params.assigneeId = castArray(filters.assigneeId).join(',');
  }
  if (filters.groupId) {
    params.groupId = castArray(filters.groupId).join(',');
  }
  if (filters.reporterId) {
    params.reporterId = castArray(filters.reporterId).join(',');
  }
  if (filters.participantId) {
    params.participantId = castArray(filters.participantId).join(',');
  }
  if (filters.language) {
    params.language = castArray(filters.language).join(',');
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
  if (!isEmpty(filters.where)) {
    params.where = JSON.stringify(filters.where);
  }
  if (filters['evaluation.ts']) {
    const dateRange = decodeDateRange(filters['evaluation.ts']);
    if (dateRange && (dateRange.from || dateRange.to)) {
      // "2021-08-01..2021-08-31", "2021-08-01..*", etc.
      params['evaluation.ts'] = [
        dateRange.from?.toISOString() ?? '*',
        dateRange.to?.toISOString() ?? '*',
      ].join('..');
    }
  }
  return params;
}

interface FetchTicketsOptions {
  page?: number;
  pageSize?: number;
  orderKey?: string;
  orderType?: 'asc' | 'desc';
  filters?: FetchTicketFilters;
  count?: boolean;
  include?: string[];
}

interface FetchTicketsResult {
  tickets: TicketSchema[];
  totalCount?: number;
}

async function fetchTickets({
  page = 1,
  pageSize = 10,
  orderKey = 'createdAt',
  orderType = 'desc',
  filters = {},
  count = true,
  include,
}: FetchTicketsOptions = {}): Promise<FetchTicketsResult> {
  const params: any = {
    ...encodeTicketFilters(filters),
    page,
    pageSize,
    count,
    orderBy: `${orderKey}-${orderType}`,
    include: include?.join(',') || undefined,
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

  const { headers, data } = await http.get('/api/2/tickets/search/v2', { params });
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

interface FetchTicketRepliesOptions {
  cursor?: string;
  deleted?: boolean;
  pageSize?: number;
  desc?: boolean;
}

export async function fetchTicketReplies(
  id: string,
  { cursor, deleted, pageSize, desc }: FetchTicketRepliesOptions = {}
): Promise<ReplySchema[]> {
  const { data } = await http.get(`/api/2/tickets/${id}/replies`, {
    params: {
      cursor,
      deleted: deleted ? 1 : undefined,
      pageSize,
      orderBy: `createdAt-${desc ? 'desc' : 'asc'}`,
    },
  });
  return data;
}

export interface CreateTicketData {
  appId?: string;
  categoryId: string;
  authorId?: string;
  organizationId?: string;
  title: string;
  content: string;
  fileIds?: string[];
  customFields?: { field: string; value: unknown }[];
}

async function createTicket(data: CreateTicketData) {
  await http.post('/api/2/tickets', data);
}

export interface UpdateTicketData {
  title?: string;
  content?: string;
  categoryId?: string;
  groupId?: string | null;
  assigneeId?: string | null;
  language?: string | null;
  tags?: { key: string; value: string }[];
  privateTags?: { key: string; value: string }[];
}

async function updateTicket(id: string | number, data: UpdateTicketData) {
  await http.patch(`/api/2/tickets/${id}`, data);
}

async function operateTicket(id: string | number, action: string) {
  await http.post(`/api/2/tickets/${id}/operate`, { action });
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

export function useCreateTicket(options?: UseMutationOptions<void, Error, CreateTicketData>) {
  return useMutation({
    mutationFn: createTicket,
    ...options,
  });
}

export function useUpdateTicket(
  options?: UseMutationOptions<void, Error, Parameters<typeof updateTicket>>
) {
  return useMutation({
    mutationFn: (args) => updateTicket.apply(null, args),
    ...options,
  });
}

export function useOperateTicket(
  options?: UseMutationOptions<void, Error, Parameters<typeof operateTicket>>
) {
  return useMutation({
    mutationFn: (args) => operateTicket.apply(null, args),
    ...options,
  });
}

interface SearchTicketCustomFieldOptions {
  fieldId?: string;
  fieldValue?: string;
  createdAt?: [Date | undefined, Date | undefined];
}

async function searchTicketCustomField({
  fieldId,
  fieldValue,
  createdAt,
}: SearchTicketCustomFieldOptions) {
  const res = await http.get<TicketSchema[]>('/api/2/tickets/search/v2', {
    params: {
      fieldId,
      fieldValue,
      createdAt: createdAt?.map((d) => (d ? d.toISOString() : '*')).join('..'),
    },
  });
  return { tickets: res.data, totalCount: Number(res.headers['x-total-count']) };
}

export function useSearchTicketCustomField(
  searchOptions: SearchTicketCustomFieldOptions,
  options?: UseQueryOptions<FetchTicketsResult, Error>
) {
  const { data, ...rest } = useQuery({
    queryKey: ['searchTicketCustomField', searchOptions],
    queryFn: () => searchTicketCustomField(searchOptions),
    ...options,
  });

  return {
    ...rest,
    data: data?.tickets,
    totalCount: data?.totalCount,
  };
}
type exportType = 'json' | 'csv';
interface ExportParams extends FetchTicketsOptions {
  type: exportType;
  utcOffset?: number;
}
async function exportTickets({ type, orderKey, orderType, filters = {}, utcOffset }: ExportParams) {
  const params = {
    ...encodeTicketFilters(filters),
    orderBy: `${orderKey}-${orderType}`,
    type,
    utcOffset,
  };
  await http.get('/api/2/tickets/export', { params });
  return;
}

export function useExportTickets(options?: UseMutationOptions<void, Error, ExportParams>) {
  return useMutation({
    mutationFn: (params: ExportParams) => exportTickets(params),
    ...options,
  });
}

export interface ExportTicketTask {
  id: string;
  operator?: UserSchema;
  status?: string;
  ticketCount?: number;
  downloadUrl?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface GetExportTicketTasksOptions {
  page?: number;
  pageSize?: number;
}

export async function getExportTicketTasks(options?: GetExportTicketTasksOptions) {
  const res = await http.get<ExportTicketTask[]>('/api/2/export-ticket-tasks', { params: options });
  return {
    data: res.data,
    totalCount: parseInt(res.headers['x-total-count']),
  };
}

interface TicketOverview {
  nid: number;
  title: string;
  content: string;
  status: number;
  latestReply?: {
    content: string;
    author: {
      id: string;
      nickname: string;
    };
    createdAt: Date;
  };
}

async function fetchTicketOverview(ticketId: string) {
  const res = await http.get<TicketOverview>(`/api/2/tickets/${ticketId}/overview`);
  return res.data;
}

export function useTicketOverview(
  ticketId: string,
  options?: UseQueryOptions<TicketOverview, Error>
) {
  return useQuery({
    queryKey: ['ticketOverview', ticketId],
    queryFn: () => fetchTicketOverview(ticketId),
    ...options,
  });
}

export interface TicketFieldValue {
  field: string;
  value: any;
  files?: {
    id: string;
    name: string;
    mime: string;
    url: string;
  }[];
}

async function fetchTicketFieldValues(ticketId: string) {
  const res = await http.get<TicketFieldValue[]>(`/api/2/tickets/${ticketId}/custom-fields`);
  return res.data;
}

export function useTicketFieldValues(
  ticketId: string,
  options?: UseQueryOptions<TicketFieldValue[]>
) {
  return useQuery({
    queryKey: ['ticketFieldValues', ticketId],
    queryFn: () => fetchTicketFieldValues(ticketId),
    ...options,
  });
}

type UpdateTicketFieldValuesData = {
  field: string;
  value: any;
}[];

async function updateTicketFieldValues(ticketId: string, data: UpdateTicketFieldValuesData) {
  await http.put(`/api/2/tickets/${ticketId}/custom-fields`, data);
}

export function useUpdateTicketFieldValues(
  options?: UseMutationOptions<void, Error, Parameters<typeof updateTicketFieldValues>>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars) => updateTicketFieldValues(...vars),
    onSuccess: (_, [ticketId, data]) => {
      queryClient.invalidateQueries(['ticketFieldValues', ticketId]);
    },
    ...options,
  });
}

interface BaseOpsLog {
  id: string;
  operatorId: string;
  createdAt: string;
}

export type OpsLog = BaseOpsLog &
  (
    | {
        action: 'selectAssignee';
        assigneeId: string;
      }
    | {
        action: 'changeAssignee';
        assigneeId?: string;
      }
    | {
        action: 'changeGroup';
        groupId?: string;
      }
    | {
        action: 'changeCategory';
        categoryId: string;
      }
    | {
        action: 'changeFields';
        changes: {
          fieldId: string;
          from: any;
          to: any;
        }[];
      }
    | {
        action: 'replyWithNoContent';
      }
    | {
        action: 'replySoon';
      }
    | {
        action: 'resolve';
      }
    | {
        action: 'close' | 'reject';
      }
    | {
        action: 'reopen';
      }
  );

interface FetchOpsLogsOptions {
  cursor?: string;
  pageSize?: number;
  desc?: boolean;
}

export async function fetchTicketOpsLogs(
  ticketId: string,
  { cursor, pageSize, desc }: FetchOpsLogsOptions = {}
) {
  const res = await http.get<OpsLog[]>(`/api/2/tickets/${ticketId}/ops-logs`, {
    params: {
      cursor,
      pageSize,
      orderBy: `createdAt-${desc ? 'desc' : 'asc'}`,
    },
  });
  return res.data;
}

interface CreateTicketReplyData {
  ticketId: string;
  content: string;
  fileIds?: string[];
  internal?: boolean;
}

async function createReply({ ticketId, content, fileIds, internal }: CreateTicketReplyData) {
  await http.post(`/api/2/tickets/${ticketId}/replies`, {
    content,
    fileIds,
    internal,
  });
}

export function useCreateReply(options?: UseMutationOptions<void, Error, CreateTicketReplyData>) {
  return useMutation({
    mutationFn: createReply,
    ...options,
  });
}

async function getAssociatedTickets(ticketId: string) {
  const res = await http.get<TicketSchema[]>(`/api/2/tickets/${ticketId}/associated-tickets`);
  return res.data;
}

export function useAssociatedTickets(ticketId: string, options?: UseQueryOptions<TicketSchema[]>) {
  return useQuery({
    queryKey: ['AssociatedTickets', ticketId],
    queryFn: () => getAssociatedTickets(ticketId),
    ...options,
  });
}

async function associatedTickets(ticket1: string, ticket2: string) {
  await http.post(`/api/2/tickets/${ticket1}/associated-tickets`, { ticketId: ticket2 });
}

export function useAssociateTickets(options?: UseMutationOptions<void, Error, [string, string]>) {
  return useMutation({
    mutationFn: (ticketIds) => associatedTickets(...ticketIds),
    ...options,
  });
}

async function disassociateTickets(ticket1: string, ticket2: string) {
  await http.delete(`/api/2/tickets/${ticket1}/associated-tickets/${ticket2}`);
}

export function useDisassociateTickets(
  options?: UseMutationOptions<void, Error, [string, string]>
) {
  return useMutation({
    mutationFn: (ticketIds) => disassociateTickets(...ticketIds),
    ...options,
  });
}
