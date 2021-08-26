import { AxiosError } from 'axios';
import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '../leancloud';

export interface UserSchema {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string;
}

export async function fetchCustomerServices(): Promise<UserSchema[]> {
  const { data } = await http.get('/api/2/customer-services');
  return data;
}

export interface UseCustomerServicesOptions extends UseQueryOptions<UserSchema[], AxiosError> {}

export function useCustomerServices(options?: UseCustomerServicesOptions) {
  return useQuery({
    queryKey: 'customerServices',
    queryFn: fetchCustomerServices,
    ...options,
  });
}

export async function fetchCustomerService(id: string): Promise<UserSchema> {
  const { data } = await http.get('/api/2/customer-services/' + id);
  return data;
}

export interface UseCustomerServiceOptions extends UseQueryOptions<UserSchema, AxiosError> {}

export function useCustomerService(id: string, options?: UseCustomerServiceOptions) {
  return useQuery({
    queryKey: ['customerService', id],
    queryFn: () => fetchCustomerService(id),
    ...options,
  });
}
