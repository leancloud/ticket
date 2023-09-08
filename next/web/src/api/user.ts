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
  email?: string;
}

export const createUser = async (data: CreateUserData) => {
  await http.post('/api/2/users/pre-create', data);
};
