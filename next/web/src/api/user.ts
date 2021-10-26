import { UseQueryOptions, useQuery } from 'react-query';

import { http } from 'leancloud';
import { GroupSchema } from './group';

export interface UserSchema {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string;
}

export async function fetchCustomerServices() {
  const { data } = await http.get<UserSchema[]>('/api/2/customer-services');
  return data;
}

export interface UseCustomerServicesOptions extends UseQueryOptions<UserSchema[], Error> {}

export function useCustomerServices(options?: UseCustomerServicesOptions) {
  return useQuery({
    queryKey: 'customerServices',
    queryFn: fetchCustomerServices,
    staleTime: Infinity,
    ...options,
  });
}

export async function fetchCustomerService(id: string) {
  const { data } = await http.get<UserSchema>('/api/2/customer-services/' + id);
  return data;
}

export interface UseCustomerServiceOptions extends UseQueryOptions<UserSchema, Error> {}

export function useCustomerService(id: string, options?: UseCustomerServiceOptions) {
  return useQuery({
    queryKey: ['customerService', id],
    queryFn: () => fetchCustomerService(id),
    ...options,
  });
}

export async function fetchCustomerServiceGroups(id: string) {
  const { data } = await http.get<GroupSchema[]>(`/api/2/customer-services/${id}/groups`);
  return data;
}

export function useCustomerServiceGroups(
  id: string,
  options?: UseQueryOptions<GroupSchema[], Error>
) {
  return useQuery({
    queryKey: ['customerServiceGroups', id],
    queryFn: () => fetchCustomerServiceGroups(id),
    ...options,
  });
}
