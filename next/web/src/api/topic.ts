import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '@/leancloud';

export interface Topic {
  id: string;
  name: string;
  articleIds: string[];
  meta?: object;
  createdAt: string;
  updatedAt: string;
}

export interface FetchTopicsOptions {
  page?: number;
  pageSize?: number;
  count?: any;
}

export interface FetchTopicsResult {
  data: Topic[];
  totalCount?: number;
}

export async function fetchTopics(options: FetchTopicsOptions): Promise<FetchTopicsResult> {
  const { data, headers } = await http.get<Topic[]>('/api/2/topics', {
    params: {
      pageSize: 1000,
      ...options,
    },
  });
  const totalCount = headers['x-total-count'];
  return {
    data,
    totalCount: totalCount ? parseInt(totalCount) : undefined,
  };
}

export interface UseTopicsOptions extends FetchTopicsOptions {
  queryOptions?: UseQueryOptions<FetchTopicsResult, Error>;
}

export function useTopics({ queryOptions, ...options }: UseTopicsOptions = {}) {
  const { data, ...results } = useQuery({
    queryKey: ['topics', options],
    queryFn: () => fetchTopics(options),
    ...queryOptions,
  });

  return { ...results, ...data };
}

async function fetchTopic(id: string, raw?: boolean) {
  const { data } = await http.get<Topic>(`/api/2/topics/${id}`, {
    params: { raw },
  });
  return data;
}

interface UseTopicOptions {
  raw?: boolean;
  queryOptions?: UseQueryOptions<Topic, Error>;
}

export function useTopic(id: string, { raw, queryOptions }: UseTopicOptions = {}) {
  return useQuery({
    queryKey: ['topic', id, raw],
    queryFn: () => fetchTopic(id, raw),
    ...queryOptions,
  });
}

export interface UpsertTopicData {
  name: string;
  articleIds: string[];
  meta?: object;
}

export async function createTopic(data: UpsertTopicData) {
  await http.post('/api/2/topics', data);
}

export interface UpdateTopicData extends Partial<UpsertTopicData> {
  comment?: string;
}

export async function updateTopic(id: string, data: UpdateTopicData) {
  await http.patch(`/api/2/topics/${id}`, data);
}

export async function deleteTopic(id: string) {
  await http.delete(`/api/2/topics/${id}`);
}
