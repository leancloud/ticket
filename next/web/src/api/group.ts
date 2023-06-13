import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from 'react-query';

import { CustomerServicePermissions, http } from '@/leancloud';

export interface GroupSchema {
  id: string;
  name: string;
  description?: string;
}

async function fetchGroups(): Promise<GroupSchema[]> {
  const { data } = await http.get('/api/2/groups');
  return data;
}

export interface GroupDetailSchema extends GroupSchema {
  userIds: string[];
}

async function fetchGroup(id: string): Promise<GroupDetailSchema> {
  const { data } = await http.get(`/api/2/groups/${id}`);
  return data;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  userIds?: string[];
  permissions?: CustomerServicePermissions;
}

async function createGroup(data: CreateGroupData) {
  await http.post('/api/2/groups', data);
}

export type UpdateGroupData = Partial<CreateGroupData>;

async function updateGroup(id: string, data: UpdateGroupData) {
  await http.patch(`/api/2/groups/${id}`, data);
}

async function deleteGroup(id: string) {
  await http.delete(`/api/2/groups/${id}`);
}

export function useGroups(options?: UseQueryOptions<GroupSchema[], Error>) {
  return useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    staleTime: Infinity,
    ...options,
  });
}

export function useGroup(id: string, options?: UseQueryOptions<GroupDetailSchema, Error>) {
  return useQuery({
    queryKey: ['group', id],
    queryFn: () => fetchGroup(id),
    ...options,
  });
}

export function useCreateGroup(options?: UseMutationOptions<void, Error, CreateGroupData>) {
  return useMutation({
    mutationFn: createGroup,
    ...options,
  });
}

export function useUpdateGroup(
  options?: UseMutationOptions<void, Error, [string, UpdateGroupData]>
) {
  return useMutation({
    mutationFn: ([id, data]) => updateGroup(id, data),
    ...options,
  });
}

export function useDeleteGroup(options?: UseMutationOptions<void, Error, string>) {
  return useMutation({
    mutationFn: deleteGroup,
    ...options,
  });
}
