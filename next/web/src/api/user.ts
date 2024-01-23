import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '@/leancloud';

export * from './customer-service';

export interface UserSchema {
  id: string;
  username: string;
  active: boolean;
  nickname: string;
  avatarUrl: string;
  email?: string;
}

interface FetchUserOptions {
  id?: string | string[];
  q?: string;
}

async function fetchUsers({ id, q }: FetchUserOptions = {}): Promise<UserSchema[]> {
  const params: Record<string, string | undefined> = { q };
  if (id) {
    if (Array.isArray(id)) {
      params.id = id.join(',');
      params.pageSize = id.length.toString();
    } else {
      params.id = id;
    }
  }
  const { data } = await http.get('/api/2/users', { params });
  return data;
}

async function fetchUser(id: string): Promise<UserSchema> {
  const { data } = await http.get(`/api/2/users/${id}`);
  return data;
}

export interface UseUsersOptions extends FetchUserOptions {
  queryOptions?: UseQueryOptions<UserSchema[], Error>;
}

export const useUsers = ({ queryOptions, ...options }: UseUsersOptions = {}) =>
  useQuery({
    queryKey: ['users', options],
    queryFn: () => fetchUsers(options),
    ...queryOptions,
  });

export const useUser = (id: string, options?: UseQueryOptions<UserSchema, Error>) =>
  useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
    ...options,
  });

export interface CreateUserData {
  username?: string;
  nickname?: string;
  email?: string;
}

export const createUser = async (data: CreateUserData) => {
  await http.post('/api/2/users/pre-create', data);
};

export interface MergeUserTaskSchema {
  id: string;
  sourceUserId: string;
  sourceUser: UserSchema;
  targetUserId: string;
  targetUser: UserSchema;
  status: string;
  completedAt: string;
  createdAt: string;
}

export interface MergeUserRequestData {
  sourceUserId: string;
  targetUserId: string;
}

export async function mergeUser(data: MergeUserRequestData) {
  const res = await http.post<MergeUserTaskSchema>('/api/2/merge-user-tasks', data);
  return res.data;
}

export interface GetMergeUserTasksOptions {
  page?: number;
  pageSize?: number;
}

export async function getMergeUserTasks(options?: GetMergeUserTasksOptions) {
  const res = await http.get<MergeUserTaskSchema[]>('/api/2/merge-user-tasks', { params: options });
  return {
    data: res.data,
    totalCount: parseInt(res.headers['x-total-count']),
  };
}
