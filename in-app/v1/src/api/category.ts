import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '@/leancloud';

export type FieldType = 'text' | 'multi-line' | 'dropdown' | 'multi-select' | 'radios' | 'file';

export interface FieldOption {
  title: string;
  value: string;
}

export interface CategoryFieldSchema {
  id: string;
  type: FieldType;
  title: string;
  description?: string;
  required: boolean;
  options?: FieldOption[];
}

export async function fetchCategoryFields(categoryId: string): Promise<CategoryFieldSchema[]> {
  const { data } = await http.get(`/api/2/categories/${categoryId}/fields`);
  return data;
}

export function useCategoryFields(
  categoryId: string,
  options?: UseQueryOptions<CategoryFieldSchema[]>
) {
  return useQuery({
    queryKey: ['categoryFields', categoryId],
    queryFn: () => fetchCategoryFields(categoryId),
    staleTime: Infinity,
    ...options,
  });
}
