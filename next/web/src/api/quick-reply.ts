import { castArray } from 'lodash-es';

import { http } from '@/leancloud';
import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from 'react-query';

export interface QuickReplySchema {
  id: string;
  name: string;
  content: string;
  userId?: string;
  fileIds?: string[];
}

async function fetchQuickReplies(userId?: string | string[]): Promise<QuickReplySchema[]> {
  const { data } = await http.get('/api/2/quick-replies', {
    params: {
      userId: userId !== undefined ? castArray(userId).join(',') : undefined,
    },
  });
  return data;
}

async function fetchQuickReply(id: string): Promise<QuickReplySchema> {
  const { data } = await http.get(`/api/2/quick-replies/${id}`);
  return data;
}

export type CreateQuickReplyData = Omit<QuickReplySchema, 'id'>;

async function createQuickReply(data: CreateQuickReplyData) {
  await http.post('/api/2/quick-replies', data);
}

export type UpdateQuickReplyData = Partial<CreateQuickReplyData>;

async function updateQuickReply(id: string, data: UpdateQuickReplyData) {
  await http.patch(`/api/2/quick-replies/${id}`, data);
}

async function deleteQuickReply(id: string) {
  await http.delete(`/api/2/quick-replies/${id}`);
}

export const useQuickReplies = (
  userId?: string | string[],
  options?: UseQueryOptions<QuickReplySchema[], Error>
) =>
  useQuery({
    queryKey: ['quickReplies', userId],
    queryFn: () => fetchQuickReplies(userId),
    staleTime: Infinity,
    ...options,
  });

export const useQuickReply = (id: string, options?: UseQueryOptions<QuickReplySchema, Error>) =>
  useQuery({
    queryKey: ['quickReply', id],
    queryFn: () => fetchQuickReply(id),
    ...options,
  });

export const useCreateQuickReply = (
  options?: UseMutationOptions<void, Error, CreateQuickReplyData>
) =>
  useMutation({
    mutationFn: createQuickReply,
    ...options,
  });

export const useUpdateQuickReply = (
  options?: UseMutationOptions<void, Error, UpdateQuickReplyData & { id: string }>
) =>
  useMutation({
    mutationFn: ({ id, ...data }) => updateQuickReply(id, data),
    ...options,
  });

export const useDeleteQuickReply = (options?: UseMutationOptions<void, Error, string>) =>
  useMutation({
    mutationFn: deleteQuickReply,
    ...options,
  });
