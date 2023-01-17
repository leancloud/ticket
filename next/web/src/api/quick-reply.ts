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

interface FetchQuickRepliesOptions {
  userId?: string | null | (string | null)[];
  page?: number;
  pageSize?: number;
  count?: boolean;
}

interface FetchQuickRepliesResult {
  data: QuickReplySchema[];
  totalCount?: number;
}

async function fetchQuickReplies(
  options: FetchQuickRepliesOptions
): Promise<FetchQuickRepliesResult> {
  let userId: string | undefined;
  if (options.userId) {
    userId = castArray(options.userId)
      .map((value) => (value === null ? 'null' : value))
      .join(',');
  }

  const { data, headers } = await http.get('/api/2/quick-replies', {
    params: {
      ...options,
      userId,
    },
  });
  const totalCount = headers['x-total-count'];
  return {
    data,
    totalCount: totalCount ? parseInt(totalCount) : undefined,
  };
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

interface UseQuickRepliesOptions extends FetchQuickRepliesOptions {
  queryOptions?: UseQueryOptions<FetchQuickRepliesResult, Error>;
}

export const useQuickReplies = ({ queryOptions, ...options }: UseQuickRepliesOptions = {}) => {
  const { data, ...result } = useQuery({
    queryKey: ['quickReplies', options],
    queryFn: () => fetchQuickReplies(options),
    staleTime: Infinity,
    ...queryOptions,
  });
  return { ...data, ...result };
};

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
