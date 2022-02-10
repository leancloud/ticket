import { useMemo } from 'react';
import { UseQueryOptions, useQuery } from 'react-query';
import { groupBy } from 'lodash-es';

import { http } from '@/leancloud';

export interface CategorySchema {
  id: string;
  name: string;
  parentId?: string;
  position: number;
  active: boolean;
  template?: string;
  articleIds?: string[];
}

async function fetchCategories(active?: boolean): Promise<CategorySchema[]> {
  const { data } = await http.get('/api/2/categories', {
    params: { active },
  });
  return data;
}

export interface CategoryGroupSchema {
  id: string;
  categoryId: string;
}

async function fetchCategoryGroups(): Promise<CategoryGroupSchema[]> {
  const res = await http.get('/api/2/categories/groups');
  return res.data;
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
  children?: CategoryTreeNode[];
}

function makeCategoryTree(categories: CategorySchema[]): CategoryTreeNode[] {
  const categoriesByParentId = groupBy(categories, 'parentId');

  const sortFn = (a: CategoryTreeNode, b: CategoryTreeNode) => {
    if (a.active === b.active) {
      return a.position - b.position;
    }
    return a.active ? -1 : 1;
  };

  const dfs = (parentId: string | undefined) => {
    const currentLevel: CategoryTreeNode[] = categoriesByParentId[parentId + ''];
    if (!currentLevel) {
      return [];
    }
    currentLevel.sort(sortFn);
    currentLevel.forEach((category) => {
      const children = dfs(category.id);
      if (children.length) {
        children.forEach((child) => (child.parent = category));
        category.children = children;
      }
    });
    return currentLevel;
  };

  return dfs(undefined);
}

export function useCategoryTree(categories?: CategorySchema[]): CategoryTreeNode[] | undefined {
  return useMemo(() => categories && makeCategoryTree(categories), [categories]);
}

export interface FaqSchema {
  id: string;
  title: string;
  content: string;
  contentSafeHTML: string;
  createdAt: string;
  updatedAt: string;
}

async function fetchCategoryFaqs(categoryId: string) {
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

async function fetchCatgoryFields(categoryId: string) {
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

export function useCategoryGroups(options?: UseQueryOptions<CategoryGroupSchema[], Error>) {
  return useQuery({
    queryKey: ['categoryGroups'],
    queryFn: fetchCategoryGroups,
    staleTime: Infinity,
    ...options,
  });
}
