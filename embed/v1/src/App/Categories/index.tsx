import { MouseEventHandler, useMemo } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { useQuery } from 'react-query';
import { ChevronRightIcon } from '@heroicons/react/solid';

import { Page } from '../components/Page';
import { Loading } from '../components/Loading';

interface CategoryItemProps {
  name: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

function CategoryItem({ name, onClick }: CategoryItemProps) {
  return (
    <div
      className="p-4 flex items-center text-gray-500 border-b border-gray-100 active:bg-gray-50"
      onClick={onClick}
    >
      <div className="h-1 w-1 bg-primary" />
      <div className="ml-4 flex-grow">{name}</div>
      <ChevronRightIcon className="h-4 w-4" />
    </div>
  );
}

export interface Category {
  id: string;
  name: string;
  parent_id?: string;
}

async function fetchCategories(): Promise<Category[]> {
  const categories = [
    { id: 'category-1', name: '账号问题' },
    { id: 'category-2', name: '充值问题' },
    { id: 'category-3', name: '账号丢失', parent_id: 'category-1' },
    { id: 'category-4', name: '登录限制', parent_id: 'category-1' },
    { id: 'category-5', name: '你咋就把账号给弄丢了呢', parent_id: 'category-3' },
  ];
  return new Promise((resolve) => {
    setTimeout(() => resolve(categories), 500);
  });
}

export function useCategories() {
  const { data: categories, ...rest } = useQuery({
    queryKey: 'categories',
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 5,
  });
  return { categories, ...rest };
}

export function useCategory(id: string) {
  const { categories, ...rest } = useCategories();
  const category = useMemo(() => categories?.find((c) => c.id === id), [categories, id]);
  return { category, ...rest };
}

export type CategoryListProps = Omit<JSX.IntrinsicElements['div'], 'onClick'> & {
  categories: Category[];
  onClick?: (category: Category) => void;
};

export function CategoryList({ categories, onClick, ...props }: CategoryListProps) {
  return (
    <div {...props} className={`${props.className} flex-auto overflow-auto`}>
      {categories.map((category) => (
        <CategoryItem key={category.id} name={category.name} onClick={() => onClick?.(category)} />
      ))}
    </div>
  );
}

export default function Categories() {
  const {
    params: { id },
  } = useRouteMatch<{ id: string }>();
  const history = useHistory();
  const { categories, error } = useCategories();

  const [filteredCategories, title] = useMemo<[Category[], string | undefined]>(() => {
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

  if (error) {
    throw error;
  }
  return (
    <Page title={title}>
      {categories ? (
        <CategoryList categories={filteredCategories} onClick={handleClick} />
      ) : (
        <Loading />
      )}
    </Page>
  );
}
