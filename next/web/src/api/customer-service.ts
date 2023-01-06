import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from 'react-query';

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

async function addCustomerService(id: string) {
  await http.post('/api/2/customer-services', { userId: id });
}

export interface UpdateCustomerServiceData {
  active?: boolean;
  id: string;
}

async function updateCustomerService({ id, ...data }: UpdateCustomerServiceData) {
  const { data: res } = await http.patch<UserSchema>(`/api/2/customer-services/${id}`, data);
  return res;
}

async function deleteCustomerService(id: string) {
  await http.delete(`/api/2/customer-services/${id}`);
}

async function addCustomerServiceCategory(customerServiceId: string, categoryId: string) {
  await http.post(`/api/2/customer-services/${customerServiceId}/categories`, {
    id: categoryId,
  });
}

async function deleteCustomerServiceCategory(customerServiceId: string, categoryId: string) {
  await http.delete(`/api/2/customer-services/${customerServiceId}/categories/${categoryId}`);
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

export function useAddCustomerService(options?: UseMutationOptions<void, Error, string>) {
  return useMutation({
    mutationFn: addCustomerService,
    ...options,
  });
}

export function useUpdateCustomerService(
  options?: UseMutationOptions<UserSchema, Error, UpdateCustomerServiceData>
) {
  return useMutation({
    mutationFn: updateCustomerService,
    ...options,
  });
}

export function useDeleteCustomerService(options?: UseMutationOptions<void, Error, string>) {
  return useMutation({
    mutationFn: deleteCustomerService,
    ...options,
  });
}

export interface MutateCustomerServiceCategoryData {
  customerServiceId: string;
  categoryId: string;
}

export function useAddCustomerServiceCategory(
  options?: UseMutationOptions<void, Error, MutateCustomerServiceCategoryData>
) {
  return useMutation({
    mutationFn: ({ customerServiceId, categoryId }) => {
      return addCustomerServiceCategory(customerServiceId, categoryId);
    },
    ...options,
  });
}

export function useDeleteCustomerServiceCategory(
  options?: UseMutationOptions<void, Error, MutateCustomerServiceCategoryData>
) {
  return useMutation({
    mutationFn: ({ customerServiceId, categoryId }) => {
      return deleteCustomerServiceCategory(customerServiceId, categoryId);
    },
    ...options,
  });
}
