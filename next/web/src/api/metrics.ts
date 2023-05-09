import { useQuery, UseQueryOptions } from 'react-query';

import { http } from '@/leancloud';
import { TicketSchema } from './ticket';

interface DurationMetric {
  id: string;
  ticket: TicketSchema;
  firstReplyTime?: number;
  firstResolutionTime?: number;
  fullResolutionTime?: number;
  requesterWaitTime?: number;
  agentWaitTime?: number;
}

export interface FetchDurationMetricsOptions {
  from: Date;
  to: Date;
  orderBy?: string;
  page?: number;
  pageSize?: number;
}

interface FetchDurationMetricsResult {
  data: DurationMetric[];
  totalCount: number;
}

async function fetchDurationMetrics(options: FetchDurationMetricsOptions) {
  const res = await http.get<DurationMetric[]>('/api/2/metrics/duration', {
    params: {
      from: options.from.toISOString(),
      to: options.to.toISOString(),
      orderBy: options.orderBy,
      page: options.page,
      pageSize: options.pageSize,
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
