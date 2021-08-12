import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '../leancloud';

export interface UserSchema {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string;
}

export async function fetchStaffs(): Promise<UserSchema[]> {
  const { data } = await http.get('/api/2/customer-services');
  return data;
}

export function useStaffs(options?: UseQueryOptions<UserSchema[], Error>) {
  return useQuery<UserSchema[], Error>('staffs', fetchStaffs, {
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

export async function fetchStaff(id: string): Promise<UserSchema> {
  const { data } = await http.get('/api/2/customer-services/' + id);
  return data;
}

export function useStaff(id: string, options?: UseQueryOptions<UserSchema, Error>) {
  return useQuery({
    queryKey: ['staff', id],
    queryFn: () => fetchStaff(id),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}
