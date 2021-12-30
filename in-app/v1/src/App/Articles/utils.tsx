import { Article } from 'types';
import { http } from 'leancloud';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { ListItem } from '../Categories';
import classNames from 'classnames';

async function fetchFAQs(categoryId?: string): Promise<Article[]> {
  if (!categoryId) return [];
  const { data } = await http.get<Article[]>(`/api/2/categories/${categoryId}/faqs`);
  return data;
}

export function useFAQs(categoryId?: string) {
  return useQuery({
    queryKey: ['category-faqs', categoryId],
    queryFn: () => fetchFAQs(categoryId),
    staleTime: 1000 * 60,
  });
}

async function fetchNotices(categoryId?: string): Promise<Article[]> {
  if (!categoryId) return [];
  const { data } = await http.get<Article[]>(`/api/2/categories/${categoryId}/notices`);
  return data;
}

export function useNotices(categoryId?: string) {
  return useQuery({
    queryKey: ['category-notices', categoryId],
    queryFn: () => fetchNotices(categoryId),
    staleTime: 1000 * 60,
  });
}

export const ArticleLink = ({
  article,
  className,
  fromCategory,
  children = article.title,
}: {
  article: Article;
  className?: string;
  fromCategory?: string;
  children?: React.ReactNode;
}) => {
  return (
    <Link
      to={`/articles/${article.id}${fromCategory ? `?from-category=${fromCategory}` : ''}`}
      className={className}
    >
      {children}
    </Link>
  );
};

export const ArticleListItem = ({
  article,
  className,
  fromCategory,
  children = article.title,
}: {
  article: Article;
  className?: string;
  fromCategory?: string;
  children?: React.ReactNode;
}) => {
  return (
    <ListItem
      key={article.id}
      to={`/articles/${article.id}${fromCategory ? `?from-category=${fromCategory}` : ''}`}
      content={children}
      className={classNames('text-[13px] !h-[38px]', className)}
    />
  );
};
