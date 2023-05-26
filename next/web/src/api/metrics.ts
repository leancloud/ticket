import { useQuery, UseQueryOptions } from 'react-query';

import { http } from '@/leancloud';
import { TicketSchema } from './ticket';

interface DurationMetrics {
  id: string;
  ticket: TicketSchema;
  agentWaitTime?: number;
  firstReplyTime?: number;
  firstResolutionTime?: number;
  fullResolutionTime?: number;
  requesterWaitTime?: number;
}

export interface DurationMetricsFilters {
  agentWaitTime?: string;
  firstReplyTime?: string;
  firstResolutionTime?: string;
  fullResolutionTime?: string;
  requesterWaitTime?: string;
}

interface FetchDurationMetricsOptions {
  from: Date;
  to: Date;
  orderBy?: string;
  page?: number;
  pageSize?: number;
  filters?: DurationMetricsFilters;
}

interface FetchDurationMetricsResult {
  data: DurationMetrics[];
  totalCount: number;
}

async function fetchDurationMetrics(options: FetchDurationMetricsOptions) {
  const res = await http.get<DurationMetrics[]>('/api/2/metrics/duration', {
    params: {
      from: options.from.toISOString(),
      to: options.to.toISOString(),
      orderBy: options.orderBy,
      page: options.page,
      pageSize: options.pageSize,
      ...options.filters,
    },
  });

  return {
    data: res.data,
    totalCount: parseInt(res.headers['x-total-count']),
  };
}

interface UseDurationMetricsOptions extends FetchDurationMetricsOptions {
  queryOptions?: UseQueryOptions<FetchDurationMetricsResult, Error>;
}

export function useDurationMetrics({ queryOptions, ...options }: UseDurationMetricsOptions) {
  return useQuery({
    queryKey: ['durationMetrics', options],
    queryFn: () => fetchDurationMetrics(options),
    ...queryOptions,
  });
}
