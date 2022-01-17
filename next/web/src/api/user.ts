import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '@/leancloud';

export interface UserSchema {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string;
}

export * from './customer-service';

export interface UserSearchResult extends UserSchema {
  email?: string;
}

async function searchUser(q: string): Promise<UserSchema[]> {
  const { data } = await http.get('/api/2/users', { params: { q } });
  return data;
}

export function useSearchUser(q: string, options?: UseQueryOptions<UserSearchResult[], Error>) {
  return useQuery({
    queryKey: ['searchUserResult', q],
    queryFn: () => searchUser(q),
    ...options,
  });
}
