import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from 'react-query';

import { http } from '@/leancloud';
import { UserSchema } from './user';

export interface VacationSchema {
  id: string;
  operator: UserSchema;
  vacationer: UserSchema;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface FetchVacationsOptions {
  vacationerId?: string;
  operatorId?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
}

interface FetchVacationsResult {
  vacations: VacationSchema[];
  totalCount: number;
}

async function fetchVacations(options?: FetchVacationsOptions): Promise<FetchVacationsResult> {
  const { headers, data } = await http.get('/api/2/vacations', {
    params: options,
  });
  return {
    vacations: data,
    totalCount: parseInt(headers['x-total-count']),
  };
}

export interface CreateVacationData {
  vacationerId: string;
  startDate: string;
  endDate: string;
}

async function createVacation(data: CreateVacationData) {
  await http.post('/api/2/vacations', data);
}

async function deleteVacation(id: string) {
  await http.delete(`/api/2/vacations/${id}`);
}

export interface UseVacationsOptions extends FetchVacationsOptions {
  queryOptions?: UseQueryOptions<FetchVacationsResult, Error>;
}

export function useVacations({ queryOptions, ...options }: UseVacationsOptions = {}) {
  const { data, ...result } = useQuery({
    queryKey: ['vacations', options],
    queryFn: () => fetchVacations(options),
    ...queryOptions,
  });
  return {
    ...result,
    data: data?.vacations,
    totalCount: data?.totalCount,
  };
}

export const useCreateVacation = (options?: UseMutationOptions<void, Error, CreateVacationData>) =>
  useMutation({
    mutationFn: createVacation,
    ...options,
  });

export const useDeleteVacation = (options?: UseMutationOptions<void, Error, string>) =>
  useMutation({
    mutationFn: deleteVacation,
    ...options,
  });
