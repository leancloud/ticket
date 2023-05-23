import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from 'react-query';

import { http } from '@/leancloud';
import { CategorySchema } from './category';

export interface Article {
  id: string;
  name: string;
  defaultLanguage: string;
  createdAt: string;
  updatedAt: string;
  publishedFrom?: string;
  publishedTo?: string;
}

export interface ArticleTranslationAbstract {
  id: string;
  title: string;
  language: string;
  slug: string;
  revision?: {
    upvote?: number;
    downvote?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ArticleTranslation extends ArticleTranslationAbstract {
  content: string;
  contentSafeHTML: string;
}

export interface FetchArticlesOptions {
  page?: number;
  pageSize?: number;
  private?: boolean;
  count?: any;
  id?: string[];
}

export interface FetchArticlesResult {
  data: Article[];
  totalCount?: number;
}

export async function fetchArticles(options: FetchArticlesOptions): Promise<FetchArticlesResult> {
  const { data, headers } = await http.get<Article[]>('/api/2/articles', {
    params: {
      pageSize: 1000,
      ...options,
      id: options.id?.join(','),
    },
  });
  const totalCount = headers['x-total-count'];
  return {
    data,
    totalCount: totalCount ? parseInt(totalCount) : undefined,
  };
}

export interface UseArticlesOptions extends FetchArticlesOptions {
  queryOptions?: UseQueryOptions<FetchArticlesResult, Error>;
}

export function useArticles({ queryOptions, ...options }: UseArticlesOptions = {}) {
  const { data, ...results } = useQuery({
    queryKey: ['articles', options],
    queryFn: () => fetchArticles(options),
    ...queryOptions,
  });

  return { ...results, ...data };
}

export async function fetchArticle(id: string) {
  const { data } = await http.get<Article>(`/api/2/articles/${id}/info`);
  return data;
}

export function useArticle(id: string, options?: UseQueryOptions<Article, Error>) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: () => fetchArticle(id),
    ...options,
  });
}

export const fetchArticleTranslations = async (id: string) => {
  const { data } = await http.get<ArticleTranslationAbstract[]>(
    `/api/2/articles/${id}/translations`
  );
  return data;
};

export const useArticleTranslations = (
  id: string,
  queryOptions?: UseQueryOptions<ArticleTranslationAbstract[], Error>
) =>
  useQuery({
    queryKey: ['ArticleTranslations', id],
    queryFn: () => fetchArticleTranslations(id),
    ...queryOptions,
  });

export const fetchArticleTranslation = async (id: string, language: string) => {
  const { data } = await http.get<ArticleTranslation>(`/api/2/articles/${id}/${language}`);
  return data;
};

export const useArticleTranslation = (
  id: string,
  language: string,
  queryOptions?: UseQueryOptions<ArticleTranslation, Error>
) =>
  useQuery({
    queryKey: ['ArticleTranslation', id, language],
    queryFn: () => fetchArticleTranslation(id, language),
    ...queryOptions,
  });

export interface CreateArticleTranslationData {
  language: string;
  title: string;
  content: string;
}

export async function createArticleTranslation(id: string, data: CreateArticleTranslationData) {
  await http.post(`/api/2/articles/${id}`, data);
}

export const useCreateArticleTranslation = (
  mutationOptions?: UseMutationOptions<void, Error, CreateArticleTranslationData & { id: string }>
) =>
  useMutation({
    mutationFn: ({ id, ...data }) => createArticleTranslation(id, data),
    ...mutationOptions,
  });

export interface UpdateArticleTranslationData extends Partial<CreateArticleTranslationData> {
  comment?: string;
}

export async function updateArticleTranslation(
  id: string,
  language: string,
  data: UpdateArticleTranslationData
) {
  await http.patch(`/api/2/articles/${id}/${language}`, data);
}

export const useUpdateArticleTranslation = (
  mutationOptions?: UseMutationOptions<
    void,
    Error,
    UpdateArticleTranslationData & { id: string; language: string }
  >
) =>
  useMutation({
    mutationFn: ({ id, language, ...data }) => updateArticleTranslation(id, language, data),
    ...mutationOptions,
  });

export async function deleteArticleTranslation(id: string, language: string) {
  await http.delete(`/api/2/articles/${id}/${language}`);
}

export const useDeleteArticleTranslation = (
  mutationOptions?: UseMutationOptions<void, Error, { id: string; language: string }>
) =>
  useMutation({
    mutationFn: ({ id, language }) => deleteArticleTranslation(id, language),
    ...mutationOptions,
  });

export interface CreateArticleData {
  name: string;
  language: string;
  title: string;
  content: string;
  publishedFrom?: string;
  publishedTo?: string;
}

export const createArticle = async (data: CreateArticleData) => {
  await http.post<Article>('/api/2/articles', data);
};

export const useCreateArticle = (
  mutationOptions?: UseMutationOptions<void, Error, CreateArticleData>
) =>
  useMutation({
    mutationFn: createArticle,
    ...mutationOptions,
  });

export interface UpdateArticleData {
  name?: string;
  defaultLanguage?: string;
  publishedFrom?: string;
  publishedTo?: string;
}

export const updateArticle = async (id: string, data: UpdateArticleData) => {
  await http.patch(`/api/2/articles/${id}`, data);
};

export const useUpdateArticle = (
  mutationOptions?: UseMutationOptions<void, Error, UpdateArticleData & { id: string }>
) =>
  useMutation({
    mutationFn: ({ id, ...data }) => updateArticle(id, data),
    ...mutationOptions,
  });

export const deleteArticle = async (id: string) => {
  await http.delete(`/api/2/articles/${id}`);
};

export const useDeleteArticle = (mutationOptions?: UseMutationOptions<void, Error, string>) =>
  useMutation({
    mutationFn: (id) => deleteArticle(id),
    ...mutationOptions,
  });

async function fetchRelatedCategories(articleId: string) {
  const { data } = await http.get<CategorySchema[]>(`/api/2/articles/${articleId}/categories`);
  return data;
}

export function useRelatedCategories(articleId: string) {
  return useQuery({
    queryKey: ['article/categories', articleId],
    queryFn: () => fetchRelatedCategories(articleId),
  });
}
