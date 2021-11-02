import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '@/leancloud';

// TODO(sdjdd): 补充类型定义
export type Condition =
  | {
      type: 'all' | 'any';
      conditions: Condition[];
    }
  | {
      type: 'unknown';
    };

export interface CreateTriggerData {
  title: string;
  description?: string;
  conditions: Condition;
  actions: any[];
}

export interface CreateTriggerResponse {
  id: string;
}

export async function createTrigger(data: CreateTriggerData) {
  const res = await http.post<CreateTriggerResponse>('/api/2/triggers', data);
  return res.data;
}

export interface TriggerData {
  id: string;
  title: string;
  description: string;
  conditions: Condition;
  actions: any[];
  position: number;
  active: boolean;
}

export async function fetchTriggers() {
  const res = await http.get<TriggerData[]>('/api/2/triggers');
  return res.data;
}

export interface UseTriggersOptions {
  queryOptions?: UseQueryOptions<TriggerData[], Error>;
}

export function useTriggers({ queryOptions }: UseTriggersOptions = {}) {
  return useQuery({
    queryKey: ['triggers'],
    queryFn: fetchTriggers,
    ...queryOptions,
  });
}

export async function fetchTrigger(id: string) {
  const res = await http.get<TriggerData>('/api/2/triggers/' + id);
  return res.data;
}

export function useTrigger(id: string, options?: UseQueryOptions<TriggerData, Error>) {
  return useQuery({
    queryKey: ['trigger', id],
    queryFn: () => fetchTrigger(id),
    ...options,
  });
}

export interface UpdateTriggerData {
  title?: string;
  description?: string;
  conditions?: Condition;
  actions?: any[];
  active?: boolean;
}

export async function updateTrigger(id: string, data: UpdateTriggerData) {
  await http.patch(`/api/2/triggers/${id}`, data);
}

export async function deleteTrigger(id: string) {
  await http.delete(`/api/2/triggers/${id}`);
}

export async function reorderTriggers(ids: string[]) {
  await http.post('/api/2/triggers/reorder', { ids });
}
