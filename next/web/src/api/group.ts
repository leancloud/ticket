import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '../leancloud';

export interface GroupSchema {
  id: string;
  name: string;
}

export async function fetchGroups(): Promise<GroupSchema[]> {
  const { data } = await http.get('/api/2/groups');
  return data;
}

export function useGroups(options?: UseQueryOptions<GroupSchema[], Error>) {
  return useQuery<GroupSchema[], Error>('groups', fetchGroups, {
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}
