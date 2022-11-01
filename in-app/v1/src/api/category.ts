import { UseQueryOptions, useQuery } from 'react-query';
import { useRootCategory } from '@/states/root-category';
import { http } from '@/leancloud';
import { Article } from '@/types';

export interface CategoryTopics {
  id: string;
  name: string;
  articleIds: string[];
  articles: Article[];
}

async function fetchCategoryTopic(categoryId?: string): Promise<CategoryTopics[]> {
  if (!categoryId) {
    return [];
  }
  const { data } = await http.get(`/api/2/categories/${categoryId}/topics`);
  return data;
}

export function useCategoryTopics(options?: UseQueryOptions<CategoryTopics[]>) {
  const rootId = useRootCategory();
  return useQuery({
    queryKey: ['categoryTopic', rootId],
    queryFn: () => fetchCategoryTopic(rootId),
    staleTime: Infinity,
    ...options,
  });
}
