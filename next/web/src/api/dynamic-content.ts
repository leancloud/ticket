import { http } from '@/leancloud';
import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from 'react-query';

export interface DynamicContentSchema {
  id: string;
  name: string;
  defaultLocale: string;
  createdAt: string;
  updatedAt: string;
}

export interface DynamicContentVariantSchema {
  id: string;
  locale: string;
  content: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FetchDynamicContentsOptions {
  page?: number;
  pageSize?: number;
}

async function fetchDynamicContents(
  options?: FetchDynamicContentsOptions
): Promise<[DynamicContentSchema[], number]> {
  const { headers, data } = await http.get('/api/2/dynamic-contents', {
    params: options,
  });
  return [data, parseInt(headers['x-total-count'])];
}

async function fetchDynamicContent(id: string): Promise<DynamicContentSchema> {
  const { data } = await http.get(`/api/2/dynamic-contents/${id}`);
  return data;
}

export interface CreateDynamicContentData {
  name: string;
  defaultLocale: string;
  content: string;
}

async function createDynamicContent(data: CreateDynamicContentData) {
  await http.post('/api/2/dynamic-contents', data);
}

export type UpdateDynamicContentData = Partial<
  Pick<CreateDynamicContentData, 'name' | 'defaultLocale'>
>;

async function updateDynamicContent(id: string, data: UpdateDynamicContentData) {
  await http.patch(`/api/2/dynamic-contents/${id}`, data);
}

async function deleteDynamicContent(id: string) {
  await http.delete(`/api/2/dynamic-contents/${id}`);
}

async function fetchDynamicContentVariants(id: string): Promise<DynamicContentVariantSchema[]> {
  const { data } = await http.get(`/api/2/dynamic-contents/${id}/variants`);
  return data;
}

export interface CreateDynamicContentVariantData {
  dynamicContentId: string;
  locale: string;
  active?: boolean;
  content: string;
}

async function createDynamicContentVariant({
  dynamicContentId,
  ...data
}: CreateDynamicContentVariantData) {
  await http.post(`/api/2/dynamic-contents/${dynamicContentId}/variants`, data);
}

export interface UpdateDynamicContentVariantData
  extends Omit<CreateDynamicContentVariantData, 'locale'> {
  variantId: string;
}

async function updateDynamicContentVariant({
  dynamicContentId,
  variantId,
  ...data
}: UpdateDynamicContentVariantData) {
  await http.patch(`/api/2/dynamic-contents/${dynamicContentId}/variants/${variantId}`, data);
}

async function deleteDynamicContentVariant(dynamicContentId: string, variantId: string) {
  await http.delete(`/api/2/dynamic-contents/${dynamicContentId}/variants/${variantId}`);
}

export interface UseDynamicContentsOptions extends FetchDynamicContentsOptions {
  queryOptions?: UseQueryOptions<[DynamicContentSchema[], number], Error>;
}

export const useDynamicContents = ({
  queryOptions,
  ...options
}: UseDynamicContentsOptions = {}) => {
  const { data, ...result } = useQuery({
    queryKey: ['dynamicContents', options],
    queryFn: () => fetchDynamicContents(options),
    ...queryOptions,
  });

  return {
    ...result,
    data: data?.[0],
    count: data?.[1],
  };
};

export const useDynamicContent = (
  id: string,
  options?: UseQueryOptions<DynamicContentSchema, Error>
) =>
  useQuery({
    queryKey: ['dynamicContent', id],
    queryFn: () => fetchDynamicContent(id),
    ...options,
  });

export const useCreateDynamicContent = (
  options?: UseMutationOptions<void, Error, CreateDynamicContentData>
) =>
  useMutation({
    mutationFn: createDynamicContent,
    ...options,
  });

export const useUpdateDynamicContent = (
  options?: UseMutationOptions<void, Error, [string, UpdateDynamicContentData]>
) =>
  useMutation({
    mutationFn: ([id, data]) => updateDynamicContent(id, data),
    ...options,
  });

export const useDeleteDynamicContent = (options?: UseMutationOptions<void, Error, string>) =>
  useMutation({
    mutationFn: deleteDynamicContent,
    ...options,
  });

export const useDynamicContentVariants = (
  id: string,
  options?: UseQueryOptions<DynamicContentVariantSchema[], Error>
) =>
  useQuery({
    queryKey: ['dynamicContentVariants', id],
    queryFn: () => fetchDynamicContentVariants(id),
    ...options,
  });

export const useCreateDynamicContentVariant = (
  options?: UseMutationOptions<void, Error, CreateDynamicContentVariantData>
) =>
  useMutation({
    mutationFn: createDynamicContentVariant,
    ...options,
  });

export const useUpdateDynamicContentVariant = (
  options?: UseMutationOptions<void, Error, UpdateDynamicContentVariantData>
) =>
  useMutation({
    mutationFn: updateDynamicContentVariant,
    ...options,
  });

export const useDeleteDynamicContentVariant = (
  options?: UseMutationOptions<void, Error, [string, string]>
) =>
  useMutation({
    mutationFn: ([dcId, vid]) => deleteDynamicContentVariant(dcId, vid),
    ...options,
  });
