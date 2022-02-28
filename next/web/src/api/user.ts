import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '@/leancloud';

export * from './customer-service';

export interface UserSchema {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string;
}

export interface UserSearchResult extends UserSchema {
  email?: string;
}

interface FetchUserOptions {
  id?: string | string[];
  q?: string;
}

async function fetchUsers({ id, q }: FetchUserOptions = {}): Promise<UserSearchResult[]> {
  const params: Record<string, string | undefined> = { q };
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

export interface UseUsersOptions extends FetchUserOptions {
  queryOptions?: UseQueryOptions<UserSearchResult[], Error>;
}

export const useUsers = ({ queryOptions, ...options }: UseUsersOptions = {}) =>
  useQuery({
    queryKey: ['users', options],
    queryFn: () => fetchUsers(options),
    ...queryOptions,
  });
