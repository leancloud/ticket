import { AxiosError } from 'axios';
import { useMemo } from 'react';
import { UseQueryOptions, useQuery } from 'react-query';

import { http } from '../leancloud';

export interface CategorySchema {
  id: string;
  name: string;
  parentId?: string;
  position: number;
  active: boolean;
}

export async function fetchCategories(active?: boolean): Promise<CategorySchema[]> {
  const { data } = await http.get('/api/2/categories', {
    params: { active },
  });
  return data;
}

export interface UseCategoriesOptions {
  active?: boolean;
  queryOptions?: UseQueryOptions<CategorySchema[], AxiosError<CategorySchema[]>>;
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
  prevSibiling?: CategoryTreeNode;
  nextSibiling?: CategoryTreeNode;
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
        category.prevSibiling = prev;
        prev.nextSibiling = category;
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
  return { ...result, data: categoryTree };
}
