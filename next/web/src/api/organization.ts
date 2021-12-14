import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '@/leancloud';

export interface OrganizationSchema {
  id: string;
  name: string;
}

export async function fetchOrganizations() {
  const { data } = await http.get<OrganizationSchema[]>('/api/2/organizations');
  return data;
}

export type UseOrganizationsOptions = UseQueryOptions<OrganizationSchema[], Error>;

export function useOrganizations(options?: UseOrganizationsOptions) {
  return useQuery({
    queryKey: 'organizations',
    queryFn: fetchOrganizations,
    staleTime: Infinity,
    ...options,
  });
}
