import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, UseQueryResult } from 'react-query';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from '@heroicons/react/solid';
import classNames from 'classnames';

import { http } from '@/leancloud';
import { Category } from '@/types';
import { PageContent, PageHeader } from '@/components/Page';
import { QueryWrapper } from '@/components/QueryWrapper';
import { APIError } from '@/components/APIError';
import { Loading } from '@/components/Loading';
import { NewTicketButton } from '@/components/NewTicketButton';
import { ArticleListItem, useFAQs } from '@/App/Articles/utils';
import styles from './index.module.css';
import { NotFoundContent } from '../NotFound';
import { useRootCategory } from '..';
import { Helmet } from 'react-helmet-async';

interface ListItemProps {
  to: string;
  content: React.ReactNode;
  marker?: boolean;
  className?: string;
}

export function ListItem({ to, content, marker, className }: ListItemProps) {
  return (
    <Link to={to} className="block px-4 active:bg-gray-50">
      <div
        className={classNames(
          'h-11 flex items-center text-[#666] border-b border-gray-100',
          className
        )}
      >
        {marker && <div className={styles.marker} />}
        <div className="grow truncate">{content}</div>
        <ChevronRightIcon className="shrink-0 h-4 w-4" />
      </div>
    </Link>
  );
}

async function fetchCategories(rootCategoryId?: string): Promise<Category[]> {
  if (rootCategoryId === undefined) {
    return [];
  }
  const { data } = await http.get<Category[]>(
    `/api/2/products/${rootCategoryId}/categories?active=true`
  );
  return data;
}

export function useCategories() {
  const rootId = useRootCategory();
  return useQuery({
    queryKey: 'categories',
    queryFn: () => fetchCategories(rootId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCategory(id: string) {
  const { data: categories, ...rest } = useCategories();
  const category = useMemo(() => categories?.find((c) => c.id === id || c.alias === id), [
    categories,
    id,
  ]);
  return { data: category, ...rest } as UseQueryResult<Category>;
}

export type CategoryListProps = JSX.IntrinsicElements['div'] & {
  categories: Category[];
  marker?: boolean;
};

export function CategoryList({ categories, marker, ...props }: CategoryListProps) {
  return (
    <div {...props}>
      {categories.map((category) => (
        <ListItem
          key={category.id}
          to={`/categories/${category.alias ?? category.id}`}
          marker={marker}
          content={category.name}
        />
      ))}
    </div>
  );
}

export default function Categories() {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const result = useCategories();
  const { data: categories, isLoading: categoriesIsLoading, error } = result;
  const { t } = useTranslation();

  const currentCategory = useMemo(
    () => categories?.find((c) => c.id === rawId || c.alias === rawId),
    [categories, rawId]
  );
  const id = currentCategory?.id;

  const subCategories = useMemo(
    () => categories?.filter((c) => c.parentId === id).sort((a, b) => a.position - b.position),
    [categories, id]
  );
  const noSubCategories = subCategories && subCategories.length === 0;

  const { data: FAQs, isLoading: FAQsIsLoading, isSuccess: FAQsIsReady } = useFAQs(
    noSubCategories ? currentCategory?.id : undefined
  );

  const noFAQs = FAQsIsReady && FAQs?.length === 0;
  const redirectToNewTicket = noSubCategories && noFAQs;
  useEffect(() => {
    if (redirectToNewTicket) {
      navigate(`/tickets/new?category_id=${id}`, { replace: true });
    }
  }, [redirectToNewTicket, navigate, id]);

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
            <h2 className="px-4 py-3 mt-1 font-bold">常见问题</h2>
            {FAQs.map((FAQ) => (
              <ArticleListItem article={FAQ} fromCategory={id} key={FAQ.id} />
            ))}
          </div>
        )}
        {!noSubCategories && (
          <>
            {!noFAQs && (
              <h2 className="px-4 py-3 mt-1 font-bold">
                若以上内容没能帮到你，请选择合适的类别以继续
              </h2>
            )}
            <CategoryList categories={subCategories!} />
          </>
        )}
        {noSubCategories && !noFAQs && (
          <p className="my-6 px-4 text-center">
            <span className="block mb-2 text-sm">若以上内容没有帮助到你</span>
            <NewTicketButton categoryId={id!} />
          </p>
        )}
      </>
    );
  })();
  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeader>{title}</PageHeader>
      <PageContent>
        <QueryWrapper result={result}>{content}</QueryWrapper>
      </PageContent>
    </>
  );
}
