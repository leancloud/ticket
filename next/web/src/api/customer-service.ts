import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from 'react-query';

import { http } from '@/leancloud';
import { GroupSchema } from './group';
import { UserSchema } from './user';

export enum CSRole {
  Admin = 'admin',
  CustomerService = 'customerService',
}

export const RoleNameMap: Record<CSRole, string> = {
  [CSRole.Admin]: '管理员',
  [CSRole.CustomerService]: '客服',
};

export interface CustomerServiceSchema extends UserSchema {
  categoryIds: string[];
}

async function fetchAdmins(): Promise<CustomerServiceSchema[]> {
  const { data } = await http.get('/api/2/customer-services?admin=true');
  return data;
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

export interface AddCustomerServiceData {
  userId: string;
  roles: CSRole[];
}

async function addCustomerService(data: AddCustomerServiceData) {
  await http.post('/api/2/customer-services', data);
}

export interface UpdateCustomerServiceData {
  active?: boolean;
  roles?: CSRole[];
  id: string;
}

async function updateCustomerService({ id, ...data }: UpdateCustomerServiceData) {
  const res = await http.patch(`/api/2/customer-services/${id}`, data);
  return res.data;
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
    staleTime: 1800_000,
    ...options,
  });
}

export function useAdmins(options?: UseQueryOptions<CustomerServiceSchema[], Error>) {
  return useQuery({
    queryKey: ['admins'],
    queryFn: fetchAdmins,
    staleTime: 7200_000,
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

export function useAddCustomerService(
  options?: UseMutationOptions<void, Error, AddCustomerServiceData>
) {
  return useMutation({
    mutationFn: addCustomerService,
    ...options,
  });
}

export function useUpdateCustomerService(
  options?: UseMutationOptions<void, Error, UpdateCustomerServiceData>
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
