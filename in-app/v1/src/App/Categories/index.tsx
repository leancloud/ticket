import { MouseEventHandler, useMemo } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { useQuery, UseQueryResult } from 'react-query';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from '@heroicons/react/solid';

import { PageContent, PageHeader } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import { http } from 'leancloud';
import { Category } from 'types';
import styles from './index.module.css';
import { APIError } from 'components/APIError';
import { NotFoundContent } from '../NotFound';
import { Button } from 'components/Button';

interface CategoryItemProps {
  name: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  marker?: boolean;
}

function CategoryItem({ name, onClick, marker }: CategoryItemProps) {
  return (
    <div className="px-5 active:bg-gray-50" onClick={onClick}>
      <div className="h-11 flex items-center text-[#666] border-b border-gray-100">
        {marker && <div className={styles.marker} />}
        <div className="flex-grow truncate">{name}</div>
        <ChevronRightIcon className="flex-shrink-0 h-4 w-4" />
      </div>
    </div>
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

export type CategoryListProps = Omit<JSX.IntrinsicElements['div'], 'onClick'> & {
  categories: Category[];
  onClick?: (category: Category) => void;
  marker?: boolean;
};

export function CategoryList({ categories, onClick, marker, ...props }: CategoryListProps) {
  return (
    <div {...props}>
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          marker={marker}
          name={category.name}
          onClick={() => onClick?.(category)}
        />
      ))}
    </div>
  );
}

export default function Categories() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const result = useCategories();
  const { t } = useTranslation();

  const currentCategory = useMemo(() => result.data?.find((category) => category.id === id), [
    result.data,
    id,
  ]);

  const categories = useMemo(
    () =>
      result.data
        ?.filter((category) => category.parentId === id)
        .sort((a, b) => a.position - b.position),
    [result.data, id]
  );

  const handleClick = ({ id }: Category) => {
    if (!result.data) {
      return;
    }
    const hasChildren = result.data.findIndex((c) => c.parentId === id) !== -1;
    if (hasChildren) {
      history.push(`/categories/${id}`);
    } else {
      history.push(`/tickets/new?category_id=${id}`);
    }
  };

  const title = result.isLoading ? t('general.loading') + '...' : currentCategory?.name;
  const content = (() => {
    if (result.error) return <APIError />;
    if (!currentCategory) return <NotFoundContent />;
    if (categories) {
      if (categories.length === 0)
        return (
          <div className="px-5 py-10 text-center">
            <p>该问题类型没有子分类</p>
            <p className="mt-2">
              <Button as={Link} to={`/tickets/new?category_id=${id}`} className="inline-block">
                提交问题
              </Button>
            </p>
          </div>
        );
      return <CategoryList categories={categories} onClick={handleClick} />;
    }
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
