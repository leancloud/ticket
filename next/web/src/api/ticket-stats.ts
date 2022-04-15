import { UseQueryOptions, useQuery } from 'react-query';
import { http } from '@/leancloud';

export interface FetchTicketStatsOptions {
  customerService?: string,
  category?: string,
  from: Date,
  to: Date
}

export interface TicketStats {
  closed: number;
  conversion: number;
  created: number;
  externalConversion: number;
  internalConversion: number;
  internalReplyCount: number;
  reopened: number;
  firstReplyCount: number;
  firstReplyTime: number;
  replyTime: number;
  replyTimeCount: number;
  replyCount: number;
  naturalReplyTime: number;
  naturalReplyCount: number;
}


async function fetchTicketStats(options?: FetchTicketStatsOptions) {
  const { data } = await http.get<TicketStats>('/api/2/ticket-stats', {
    params: options,
  });
  return data
}
export interface UseTicketStatsOptions extends FetchTicketStatsOptions {
  queryOptions?: UseQueryOptions<TicketStats, Error>;
}
export function useTicketStats({
  queryOptions, ...options
}: UseTicketStatsOptions) {
  return useQuery({
    queryKey: ['ticketStats', options],
    queryFn: () => fetchTicketStats(options),
    ...queryOptions,
  });
}

export type TicketFieldStat = Partial<TicketStats> & {
  date: Date;
  categoryId?: string;
  customerServiceId?: string;
  replyTimeAVG?: number;
  firstReplyTimeAVG?: number;
  naturalReplyTimeAVG?: number;
}

interface TicketFieldStatsOptions extends FetchTicketStatsOptions {
  fields: string[];
}
async function fetchTicketFieldStats({ fields, ...rest }: TicketFieldStatsOptions) {
  const { data } = await http.get<TicketFieldStat[]>(`/api/2/ticket-stats/fields`, {
    params: {
      ...rest,
      fields: fields.join(',')
    },
  });
  return data
}
export interface UseTicketFieldStatsOptions extends TicketFieldStatsOptions {
  queryOptions?: UseQueryOptions<TicketFieldStat[], Error>;
}
export function useTicketFieldStats({
  queryOptions, ...options
}: UseTicketFieldStatsOptions) {
  return useQuery({
    queryKey: ['ticketFiledStats', options],
    queryFn: () => fetchTicketFieldStats(options),
    ...queryOptions,
  });
}

interface TicketStatusOptions {
  from: Date,
  to: Date
}
export interface TicketStatus {
  id: string,
  date: Date,
  notProcessed: number;
  waitingCustomer: number;
  waitingCustomerService: number;
  preFulfilled: number;
  fulfilled: number;
  closed: number;
}
async function fetchTicketStatus(params: TicketStatusOptions) {
  const { data } = await http.get<TicketStatus[]>(`/api/2/ticket-stats/status`, {
    params,
  });
  return data
}
export interface UseTicketTicketStatusOptions extends TicketStatusOptions {
  queryOptions?: UseQueryOptions<TicketStatus[], Error>;
}
export function useTicketStatus({
  queryOptions, ...options
}: UseTicketTicketStatusOptions) {
  return useQuery({
    queryKey: ['ticketStatus', options],
    queryFn: () => fetchTicketStatus(options),
    ...queryOptions,
  });
}

interface ReplyDetailsOptions {
  from: Date;
  to: Date;
  field: string;
  category?: string;
  customerService?: string;
}
interface ReplyDetail {
  replyTime: number;
  id: string;
  nid: number;
}

async function fetchReplyDetails(params: ReplyDetailsOptions) {
  const { data } = await http.get<ReplyDetail[]>(`/api/2/ticket-stats/details`, {
    params,
  });
  return data
}

export interface UseReplyDetailsOptions extends ReplyDetailsOptions {
  queryOptions?: UseQueryOptions<ReplyDetail[], Error>;
}
export function useReplyDetails({
  queryOptions, ...options
}: UseReplyDetailsOptions) {
  return useQuery({
    queryKey: ['replyDetails', options],
    queryFn: () => fetchReplyDetails(options),
    ...queryOptions,
  });
}

