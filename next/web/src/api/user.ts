import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '@/leancloud';

export * from './customer-service';

export interface UserSchema {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string;
}

interface FetchUserOptions {
  id?: string | string[];
}

async function fetchUsers({ id }: FetchUserOptions = {}): Promise<UserSchema[]> {
  const params: Record<string, string> = {};
  if (id) {
    if (Array.isArray(id)) {
      params.id = id.join(',');
    } else {
      params.id = id;
    }
  }
  const { data } = await http.get('/api/2/users', { params });
  return data;
}

export interface UserSearchResult extends UserSchema {
  email?: string;
}

async function searchUser(q: string): Promise<UserSchema[]> {
  const { data } = await http.get('/api/2/users', { params: { q } });
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

export function useSearchUser(q: string, options?: UseQueryOptions<UserSearchResult[], Error>) {
  return useQuery({
    queryKey: ['searchUserResult', q],
    queryFn: () => searchUser(q),
    ...options,
  });
}
