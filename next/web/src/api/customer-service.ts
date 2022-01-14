import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '@/leancloud';
import { GroupSchema } from './group';
import { UserSchema } from './user';

export interface CustomerServiceSchema extends UserSchema {
  categoryIds: string[];
}

async function fetchCustomerServices(): Promise<CustomerServiceSchema[]> {
  const { data } = await http.get('/api/2/customer-services');
  return data;
}

async function fetchCustomerService(id: string): Promise<CustomerServiceSchema> {
  const { data } = await http.get(`/api/2/customer-services/${id}`);
  return data;
}

async function fetchCustomerServiceGroups(id: string): Promise<GroupSchema[]> {
  const { data } = await http.get(`/api/2/customer-services/${id}/groups`);
  return data;
}

export function useCustomerServices(options?: UseQueryOptions<CustomerServiceSchema[], Error>) {
  return useQuery({
    queryKey: ['customerServices'],
    queryFn: fetchCustomerServices,
    staleTime: Infinity,
    ...options,
  });
}

export function useCustomerService(
  id: string,
  options?: UseQueryOptions<CustomerServiceSchema, Error>
) {
  return useQuery({
    queryKey: ['customerService', id],
    queryFn: () => fetchCustomerService(id),
    ...options,
  });
}

export function useCustomerServiceGroups(
  id: string,
  options?: UseQueryOptions<GroupSchema[], Error>
) {
  return useQuery({
    queryKey: ['customerServcieGroups', id],
    queryFn: () => fetchCustomerServiceGroups(id),
    ...options,
  });
}
