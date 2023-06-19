import { http } from '@/leancloud';
import { Article } from '@/types';
import { useQuery, UseQueryOptions } from 'react-query';

async function getArticle(id: string, locale?: string) {
  return (await http.get<Article>(`/api/2/articles/${id}`, { params: { locale } })).data;
}

export function useArticle(id: string, options?: UseQueryOptions<Article, Error>) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: () => getArticle(id),
    staleTime: 60_000,
    ...options,
  });
}
