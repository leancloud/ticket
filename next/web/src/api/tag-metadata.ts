import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from 'react-query';

import { http } from '@/leancloud';

export interface TagMetadataSchema {
  id: string;
  key: string;
  type: 'select' | 'text';
  values?: string[];
  private: boolean;
}

async function fetchTagMetadatas(): Promise<TagMetadataSchema[]> {
  const { data } = await http.get('/api/2/tag-metadatas');
  return data;
}

type CreateTagMetadataData = Omit<TagMetadataSchema, 'id'>;

async function createTagMetadata(data: CreateTagMetadataData) {
  await http.post('/api/2/tag-metadatas', data);
}

type UpdateTagMetadataData = Partial<CreateTagMetadataData>;

async function updateTagMetadata(id: string, data: UpdateTagMetadataData) {
  await http.patch(`/api/2/tag-metadatas/${id}`, data);
}

async function deleteTagMetadata(id: string) {
  await http.delete(`/api/2/tag-metadatas/${id}`);
}

export const useTagMetadatas = (options?: UseQueryOptions<TagMetadataSchema[], Error>) =>
  useQuery({
    queryKey: ['tagMetadatas'],
    queryFn: fetchTagMetadatas,
    staleTime: Infinity,
    ...options,
  });

export const useCreateTagMetadata = (
  options?: UseMutationOptions<void, Error, CreateTagMetadataData>
) =>
  useMutation({
    mutationFn: createTagMetadata,
    ...options,
  });

export const useUpdateTagMetadata = (
  options?: UseMutationOptions<void, Error, UpdateTagMetadataData & { id: string }>
) =>
  useMutation({
    mutationFn: ({ id, ...data }) => updateTagMetadata(id, data),
    ...options,
  });

export const useDeleteTagMatadata = (options?: UseMutationOptions<void, Error, string>) =>
  useMutation({
    mutationFn: deleteTagMetadata,
    ...options,
  });
