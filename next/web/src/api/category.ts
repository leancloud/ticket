import { useMemo } from 'react';
import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '../leancloud';

export interface CategorySchema {
  id: string;
  name: string;
  parentId?: string;
  position: number;
  active: boolean;
  template?: string;
}

export async function fetchCategories(active?: boolean) {
  const { data } = await http.get<CategorySchema[]>('/api/2/categories', {
    params: { active },
  });
  return data;
}

export interface UseCategoriesOptions {
  active?: boolean;
  queryOptions?: UseQueryOptions<CategorySchema[], Error>;
}

export function useCategories({ active, queryOptions }: UseCategoriesOptions = {}) {
  return useQuery({
    queryKey: ['categories', active],
    queryFn: () => fetchCategories(active),
    staleTime: Infinity,
    ...queryOptions,
  });
}

export interface CategoryTreeNode extends CategorySchema {
  parent?: CategoryTreeNode;
  prevSibling?: CategoryTreeNode;
  nextSibling?: CategoryTreeNode;
  children?: CategoryTreeNode[];
}

function makeCategoryTree(categories: CategorySchema[]): CategoryTreeNode[] {
  const sortFn = (a: CategoryTreeNode, b: CategoryTreeNode) => a.position - b.position;

  const dfs = (parentId?: string) => {
    const currentLevel: CategoryTreeNode[] = categories.filter((c) => c.parentId === parentId);
    currentLevel.sort(sortFn);
    currentLevel.forEach((category, index) => {
      if (index) {
        const prev = currentLevel[index - 1];
        category.prevSibling = prev;
        prev.nextSibling = category;
      }
      const children = dfs(category.id);
      children.forEach((child) => (child.parent = category));
      if (children.length) {
        category.children = children;
      }
    });
    return currentLevel;
  };

  return dfs();
}

export function useCategoryTree(options?: UseCategoriesOptions) {
  const { data, ...result } = useCategories(options);
  const categoryTree = useMemo(() => data && makeCategoryTree(data), [data]);
  return { ...result, data: categoryTree, categories: data };
}

export interface FaqSchema {
  id: string;
  title: string;
  content: string;
  contentSafeHTML: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchCategoryFaqs(categoryId: string) {
  const { data } = await http.get<FaqSchema[]>(`/api/2/categories/${categoryId}/faqs`);
  return data;
}

export type UseCategoryFaqsOptions = UseQueryOptions<FaqSchema[], Error>;

export function useCategoryFaqs(categoryId: string, options?: UseCategoryFaqsOptions) {
  return useQuery({
    queryKey: ['categoryFaqs', categoryId],
    queryFn: () => fetchCategoryFaqs(categoryId),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

export interface CategoryFieldSchema {
  id: string;
  type: 'text' | 'multi-line' | 'dropdown' | 'multi-select' | 'radios' | 'file';
  title: string;
  description?: string;
  required: boolean;
  options?: { title: string; value: string }[];
}

export async function fetchCatgoryFields(categoryId: string) {
  const { data } = await http.get<CategoryFieldSchema[]>(`/api/2/categories/${categoryId}/fields`);
  return data;
}

export type UseCategoryFieldsOptions = UseQueryOptions<CategoryFieldSchema[]>;

export function useCategoryFields(categoryId: string, options?: UseCategoryFieldsOptions) {
  return useQuery({
    queryKey: ['categoryFields', categoryId],
    queryFn: () => fetchCatgoryFields(categoryId),
    ...options,
  });
}
