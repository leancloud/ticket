import { useMemo } from 'react';
import { UseQueryOptions, useQuery, UseMutationOptions, useMutation } from 'react-query';
import { groupBy } from 'lodash-es';

import { http } from '@/leancloud';

export interface CategorySchema {
  id: string;
  alias?: string;
  name: string;
  rawName: string;
  description?: string;
  parentId?: string;
  position: number;
  active: boolean;
  hidden?: boolean;
  template?: string;
  meta?: Record<string, any>;
  articleIds?: string[];
  noticeIds?: string[];
  topicIds?: string[];
  formId?: string;
  groupId?: string;
  articleId?: string | null;
  isTicketEnabled: boolean;
  ticketDescription?: string;
}

async function fetchCategories(active?: boolean): Promise<CategorySchema[]> {
  const { data } = await http.get('/api/2/categories', {
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

export type CategoryTreeNode<T = {}> = {
  parent?: CategoryTreeNode<T>;
  children?: CategoryTreeNode<T>[];
} & CategorySchema &
  T;

export function makeCategoryTree<T = {}>(categories: CategorySchema[]): CategoryTreeNode<T>[] {
  const categoriesByParentId = groupBy(categories, 'parentId');

  const sortFn = (a: CategoryTreeNode, b: CategoryTreeNode) => {
    if (a.active === b.active) {
      return a.position - b.position;
    }
    return a.active ? -1 : 1;
  };

  const dfs = (parentId: string | undefined) => {
    const currentLevel = categoriesByParentId[parentId + '']?.map((c) => ({
      ...c,
    })) as CategoryTreeNode<T>[];
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

export interface CreateCategoryData {
  name: string;
  description?: string;
  parentId?: string;
  noticeIds?: string[];
  articleIds?: string[];
  topicIds?: string[];
  groupId?: string;
  formId?: string;
  template?: string;
  meta?: Record<string, any>;
  hidden?: boolean;
}

async function createCategory(data: CreateCategoryData) {
  await http.post('/api/2/categories', data);
}

export const useCreateCategory = (options?: UseMutationOptions<void, Error, CreateCategoryData>) =>
  useMutation({
    mutationFn: createCategory,
    ...options,
  });

export interface UpdateCategoryData extends Partial<Omit<CreateCategoryData, 'meta'>> {
  position?: number;
  active?: boolean;
  meta?: Record<string, any> | null;
}

async function updateCategory(id: string, data: UpdateCategoryData) {
  await http.patch(`/api/2/categories/${id}`, data);
}

export const useUpdateCategory = (
  options?: UseMutationOptions<void, Error, UpdateCategoryData & { id: string }>
) =>
  useMutation({
    mutationFn: ({ id, ...data }) => updateCategory(id, data),
    ...options,
  });

export type BatchUpdateCategoryData = (UpdateCategoryData & { id: string })[];

async function batchUpdateCategory(data: BatchUpdateCategoryData) {
  const res = await http.post('/api/2/categories/batch-update', data);
  return res.data;
}

export const useBatchUpdateCategory = (
  options?: UseMutationOptions<void, Error, BatchUpdateCategoryData>
) =>
  useMutation({
    mutationFn: batchUpdateCategory,
    ...options,
  });

async function fetchCategory(id: string) {
  const res = await http.get<CategorySchema>(`/api/2/categories/${id}`);
  return res.data;
}

export function useCategory(id: string, options?: UseQueryOptions<CategorySchema>) {
  return useQuery({
    queryKey: ['category', id],
    queryFn: () => fetchCategory(id),
    ...options,
  });
}

export type ClassifyResult =
  | {
      status: 'success';
      data: {
        name: string;
        id: string;
      };
    }
  | { status: 'failed' };

export const classifyTicket = async (categoryId: string, content: string) => {
  const { data } = await http.post<ClassifyResult>('/api/2/categories/classify', {
    productId: categoryId,
    content,
  });
  return data;
};

export const useClassifyTicket = (
  options?: UseMutationOptions<ClassifyResult, Error, { categoryId: string; content: string }>
) =>
  useMutation({
    mutationFn: ({ categoryId, content }) => classifyTicket(categoryId, content),
    ...options,
  });
