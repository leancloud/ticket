import { useEffect, useMemo } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { useQuery, UseQueryResult } from 'react-query';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from '@heroicons/react/solid';

import { PageContent, PageHeader } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import { http } from 'leancloud';
import { Article, Category } from 'types';
import styles from './index.module.css';
import { APIError } from 'components/APIError';
import { NotFoundContent } from '../NotFound';
import { Button } from 'components/Button';
import { Loading } from 'components/Loading';

interface CategoryItemProps {
  id: string;
  name: string;
  marker?: boolean;
}

function CategoryItem({ id, name, marker }: CategoryItemProps) {
  return (
    <Link to={`/categories/${id}`} className="block px-5 active:bg-gray-50">
      <div className="h-11 flex items-center text-[#666] border-b border-gray-100">
        {marker && <div className={styles.marker} />}
        <div className="flex-grow truncate">{name}</div>
        <ChevronRightIcon className="flex-shrink-0 h-4 w-4" />
      </div>
    </Link>
  );
}

async function fetchCategories(): Promise<Category[]> {
  const { data } = await http.get<Category[]>('/api/2/categories?active=true');
  return data;
}

export function useCategories() {
  return useQuery({
    queryKey: 'categories',
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCategory(id: string) {
  const { data: categories, ...rest } = useCategories();
  const category = useMemo(() => categories?.find((c) => c.id === id), [categories, id]);
  return { data: category, ...rest } as UseQueryResult<Category>;
}

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

export type CategoryListProps = JSX.IntrinsicElements['div'] & {
  categories: Category[];
  marker?: boolean;
};

export function CategoryList({ categories, marker, ...props }: CategoryListProps) {
  return (
    <div {...props}>
      {categories.map((category) => (
        <CategoryItem key={category.id} id={category.id} marker={marker} name={category.name} />
      ))}
    </div>
  );
}

export default function Categories() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const result = useCategories();
  const { data: categories, isLoading: categoriesIsLoading, error } = result;
  const { t } = useTranslation();

  const currentCategory = useMemo(() => categories?.find((c) => c.id === id), [categories, id]);

  const subCategories = useMemo(
    () => categories?.filter((c) => c.parentId === id).sort((a, b) => a.position - b.position),
    [categories, id]
  );

  const { data: FAQs, isLoading: FAQsIsLoading, isSuccess: FAQsIsReady } = useFAQs(
    currentCategory?.id
  );

  const noSubCategories = subCategories && subCategories.length === 0;
  const noFAQs = FAQsIsReady && FAQs?.length === 0;
  const redirectToNewTicket = noSubCategories && noFAQs;
  useEffect(() => {
    if (redirectToNewTicket) {
      history.replace(`/tickets/new?category_id=${id}`);
    }
  }, [redirectToNewTicket, history, id]);

  const isLoading = categoriesIsLoading || FAQsIsLoading;
  const title = isLoading ? t('general.loading') + '...' : currentCategory?.name;
  const content = (() => {
    if (error) return <APIError />;
    if (isLoading) return <Loading />;
    if (!currentCategory) return <NotFoundContent />;
    return (
      <>
        {FAQs && FAQs.length > 0 && (
          <div className="mb-2">
            <h2 className="px-5 py-3 font-bold">常见问题</h2>
            {FAQs.map((FAQ) => (
              <ArticleLink article={FAQ} key={FAQ.id} className="block px-5 py-1.5 text-tapBlue" />
            ))}
          </div>
        )}
        {!noSubCategories && (
          <>
            {!noFAQs && (
              <h2 className="px-5 py-3 font-bold">仍然需要帮助？请从下列选项中选择一个类别</h2>
            )}
            <CategoryList categories={subCategories!} />
          </>
        )}
        {noSubCategories && !noFAQs && (
          <div>
            <h2 className="px-5 py-3 font-bold">仍然需要帮助？</h2>
            <p className="mt-2 px-5">
              <Button as={Link} to={`/tickets/new?category_id=${id}`} className="inline-block">
                联系客服
              </Button>
            </p>
          </div>
        )}
      </>
    );
  })();
  return (
    <>
      <PageHeader>{title}</PageHeader>
      <PageContent>
        <QueryWrapper result={result}>{content}</QueryWrapper>
      </PageContent>
    </>
  );
}

export const ArticleLink = ({ article, className }: { article: Article; className?: string }) => {
  return (
    <Link to={`/articles/${article.id}`} className={className}>
      {article.title}
    </Link>
  );
};
