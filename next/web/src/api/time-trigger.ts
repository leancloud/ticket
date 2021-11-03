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

export type Action = {
  type: string;
  [key: string]: any;
};

export interface TimeTriggerSchema {
  id: string;
  title: string;
  description: string;
  conditions: Condition;
  actions: Action[];
  position: number;
  active: boolean;
}

export interface CreateTimeTriggerData {
  title: string;
  description?: string;
  conditions: Condition;
  actions: Action[];
}

export async function createTimeTrigger(data: CreateTimeTriggerData) {
  const res = await http.post<{ id: string }>('/api/2/time-triggers', data);
  return res.data;
}

export async function fetchTimeTriggers() {
  const res = await http.get<TimeTriggerSchema[]>('/api/2/time-triggers');
  return res.data;
}

export async function fetchTimeTrigger(id: string) {
  const res = await http.get<TimeTriggerSchema>('/api/2/time-triggers/' + id);
  return res.data;
}

export interface UpdateTimeTriggerData {
  title?: string;
  description?: string;
  conditions?: Condition;
  actione?: Action[];
  active?: boolean;
}

export async function updateTimeTrigger(id: string, data: UpdateTimeTriggerData) {
  await http.patch(`/api/2/time-triggers/${id}`, data);
}

export async function deleteTimeTrigger(id: string) {
  await http.delete(`/api/2/time-triggers/${id}`);
}

export async function reorderTimeTrigger(ids: string[]) {
  await http.post('/api/2/time-triggers/reorder', { ids });
}

export interface UseTimeTriggersOptions {
  queryOptions?: UseQueryOptions<TimeTriggerSchema[], Error>;
}

export function useTimeTriggers({ queryOptions }: UseTimeTriggersOptions = {}) {
  return useQuery({
    queryKey: ['time-triggers'],
    queryFn: fetchTimeTriggers,
    ...queryOptions,
  });
}

export function useTimeTrigger(id: string, options?: UseQueryOptions<TimeTriggerSchema, Error>) {
  return useQuery({
    queryKey: ['time-trigger', id],
    queryFn: () => fetchTimeTrigger(id),
    ...options,
  });
}
