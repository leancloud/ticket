import { MouseEventHandler, useMemo } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { useQuery, UseQueryResult } from 'react-query';
import { ChevronRightIcon } from '@heroicons/react/solid';

import { Page } from 'components/Page';
import { QueryWrapper } from 'components/QueryWrapper';
import { http } from 'leancloud';

interface CategoryItemProps {
  name: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  marker?: boolean;
}

function CategoryItem({ name, onClick, marker }: CategoryItemProps) {
  return (
    <div
      className="p-4 flex items-center text-gray-500 border-b border-gray-100 active:bg-gray-50"
      onClick={onClick}
    >
      {marker && <div className="h-1 w-1 bg-tapBlue-600 mr-4" />}
      <div className="flex-grow">{name}</div>
      <ChevronRightIcon className="h-4 w-4" />
    </div>
  );
}
export interface Category {
  id: string;
  name: string;
  parent_id?: string;
  position: number;
}

async function fetchCategories(): Promise<Category[]> {
  const { data } = await http.get<Category[]>('/api/1/categories', {
    params: {
      active: true,
    },
  });
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
    <div {...props} className={`${props.className} flex-auto overflow-auto`}>
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
  const {
    params: { id },
  } = useRouteMatch<{ id: string }>();
  const history = useHistory();
  const result = useCategories();
  const categories = result.data;

  const [filteredCategories, title] = useMemo(() => {
    const filteredCategories: Category[] = [];
    let title: string | undefined = undefined;
    categories?.forEach((category) => {
      if (category.id === id) {
        title = category.name;
      }
      if (category.parent_id === id) {
        filteredCategories.push(category);
      }
    });
    filteredCategories.sort((a, b) => a.position - b.position);
    return [filteredCategories, title];
  }, [categories, id]);

  const handleClick = ({ id }: Category) => {
    if (!categories) {
      return;
    }
    const hasChildren = categories.findIndex((c) => c.parent_id === id) !== -1;
    if (hasChildren) {
      history.push(`/categories/${id}`);
    } else {
      history.push(`/tickets/new?category_id=${id}`);
    }
  };

  return (
    <Page title={title}>
      <QueryWrapper result={result}>
        <CategoryList categories={filteredCategories} onClick={handleClick} />
      </QueryWrapper>
    </Page>
  );
}
