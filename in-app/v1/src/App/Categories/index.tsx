import { MouseEventHandler, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useQuery, UseQueryResult } from 'react-query';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from '@heroicons/react/solid';

import { PageContent, PageHeader } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import { http } from 'leancloud';
import { Category } from 'types';
import styles from './index.module.css';

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
  const [categories, setCateogries] = useState<Category[]>([]);
  const { t } = useTranslation();
  const [title, setTitle] = useState(t('general.loading') + '...');

  useEffect(() => {
    if (result.data) {
      const categories: Category[] = [];
      result.data.forEach((category) => {
        if (category.id === id) {
          setTitle(category.name);
        }
        if (category.parentId === id) {
          categories.push(category);
        }
      });
      if (categories.length) {
        categories.sort((a, b) => a.position - b.position);
        setCateogries(categories);
      } else {
        history.push('/404');
      }
    } else {
      setTitle(t('general.loading') + '...');
    }
  }, [t, result.data, id, history]);

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

  return (
    <>
      <PageHeader>{title}</PageHeader>
      <PageContent>
        <QueryWrapper result={result}>
          <CategoryList categories={categories} onClick={handleClick} />
        </QueryWrapper>
      </PageContent>
    </>
  );
}
