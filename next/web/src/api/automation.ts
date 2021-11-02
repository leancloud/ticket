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

export interface AutomationSchema {
  id: string;
  title: string;
  description: string;
  conditions: Condition;
  actions: Action[];
  position: number;
  active: boolean;
}

export interface CreateAutomationData {
  title: string;
  description?: string;
  conditions: Condition;
  actions: Action[];
}

export async function createAutomation(data: CreateAutomationData) {
  const res = await http.post<{ id: string }>('/api/2/automations', data);
  return res.data;
}

export async function fetchAutomations() {
  const res = await http.get<AutomationSchema[]>('/api/2/automations');
  return res.data;
}

export async function fetchAutomation(id: string) {
  const res = await http.get<AutomationSchema>('/api/2/automations/' + id);
  return res.data;
}

export interface UpdateAutomationData {
  title?: string;
  description?: string;
  conditions?: Condition;
  actione?: Action[];
  active?: boolean;
}

export async function updateAutomation(id: string, data: UpdateAutomationData) {
  await http.patch(`/api/2/automations/${id}`, data);
}

export async function deleteAutomation(id: string) {
  await http.delete(`/api/2/automations/${id}`);
}

export async function reorderAutomations(ids: string[]) {
  await http.post('/api/2/automations/reorder', { ids });
}

export interface UseAutomationsOptions {
  queryOptions?: UseQueryOptions<AutomationSchema[], Error>;
}

export function useAutomations({ queryOptions }: UseAutomationsOptions = {}) {
  return useQuery({
    queryKey: ['automations'],
    queryFn: fetchAutomations,
    ...queryOptions,
  });
}

export function useAutomation(id: string, options?: UseQueryOptions<AutomationSchema, Error>) {
  return useQuery({
    queryKey: ['automation', id],
    queryFn: () => fetchAutomation(id),
    ...options,
  });
}
