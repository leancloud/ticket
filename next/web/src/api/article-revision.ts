import { http } from '@/leancloud';
import { UseQueryOptions, useQuery } from 'react-query';
import { UserSchema } from './user';

export interface ArticleRevisionListItem {
  id: string;
  meta?: boolean;
  private?: boolean;
  title?: string;
  author: UserSchema;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FetchArticleRevisionsOptions {
  page?: number;
  pageSize?: number;
  meta?: boolean;
  count?: any;
}

export interface FetchArticleRevisionsResult {
  data: ArticleRevisionListItem[];
  totalCount?: number;
}

export async function fetchArticleRevisions(
  articleId: string,
  options: FetchArticleRevisionsOptions
): Promise<FetchArticleRevisionsResult> {
  const { data, headers } = await http.get<ArticleRevisionListItem[]>(
    `/api/2/articles/${articleId}/revisions`,
    {
      params: options,
    }
  );
  const totalCount = headers['x-total-count'];
  return {
    data,
    totalCount: totalCount ? parseInt(totalCount) : undefined,
  };
}

export interface UseArticleRevisionsOptions extends FetchArticleRevisionsOptions {
  queryOptions?: UseQueryOptions<FetchArticleRevisionsResult, Error>;
}

export function useArticleRevisions(
  id: string,
  { queryOptions, ...options }: UseArticleRevisionsOptions = {}
) {
  const { data, ...results } = useQuery({
    queryKey: ['articles', id, 'revisions', options],
    queryFn: () => fetchArticleRevisions(id, options),
    ...queryOptions,
  });

  return {
    ...results,
    data: data?.data,
    totalCount: data?.totalCount,
  };
}

export interface ArticleRevision extends ArticleRevisionListItem {
  content?: string;
  contentSafeHTML?: string;
}

export async function fetchArticleRevision(articleId: string, revisionId: string) {
  const { data } = await http.get<ArticleRevision>(
    `/api/2/articles/${articleId}/revisions/${revisionId}`
  );
  return data;
}

export function useArticleRevision(
  articleId: string,
  revisionId: string,
  options?: UseQueryOptions<ArticleRevision, Error>
) {
  return useQuery({
    queryKey: ['articles', articleId, 'revisions', revisionId],
    queryFn: () => fetchArticleRevision(articleId, revisionId),
    ...options,
  });
}
