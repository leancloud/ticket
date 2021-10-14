import { AxiosError } from 'axios';
import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '../leancloud';

export interface GroupSchema {
  id: string;
  name: string;
}

export async function fetchGroups() {
  const { data } = await http.get<GroupSchema[]>('/api/2/groups');
  return data;
}

export function useGroups(options?: UseQueryOptions<GroupSchema[], AxiosError>) {
  return useQuery({
    queryKey: 'groups',
    queryFn: fetchGroups,
    staleTime: Infinity,
    ...options,
  });
}
