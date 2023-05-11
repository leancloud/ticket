import { useEffect } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from 'react-query';
import { http } from '@/leancloud';
import { Article } from '@/types';

async function getArticle(id: string, locale?: string) {
  const res = await http.get<Article>(`/api/2/articles/${id}`, { params: { locale } });
  return res.data;
}

export function useArticle(id: string, options?: UseQueryOptions<Article>) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: () => getArticle(id),
    ...options,
  });
}

export function usePresetArticles(articles?: Article[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    articles?.forEach((article) => {
      queryClient.setQueryData(['article', article.id], article);
    });
  }, [articles]);
}
