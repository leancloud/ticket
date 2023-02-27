import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from 'react-query';

import { http } from '@/leancloud';
import { UserSchema } from './user';

async function getCollaborators() {
  const res = await http.get<UserSchema[]>('/api/2/collaborators');
  return res.data;
}

async function createCollaborator(userId: string) {
  await http.post('/api/2/collaborators', { userId });
}

async function deleteCollaborator(userId: string) {
  await http.delete(`/api/2/collaborators/${userId}`);
}

export function useCollaborators(options?: UseQueryOptions<UserSchema[]>) {
  return useQuery({
    queryKey: ['collaborators'],
    queryFn: getCollaborators,
    cacheTime: Infinity,
    staleTime: Infinity,
    ...options,
  });
}

export function useCreateCollaborator(options?: UseMutationOptions<void, Error, string>) {
  return useMutation({
    mutationFn: createCollaborator,
    ...options,
  });
}

export function useDeleteCollaborator(options?: UseMutationOptions<void, Error, string>) {
  return useMutation({
    mutationFn: deleteCollaborator,
    ...options,
  });
}
