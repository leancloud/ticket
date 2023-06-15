import {
  ComponentPropsWithoutRef,
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from 'react';
import cx from 'classnames';
import { keyBy } from 'lodash-es';

import { CategorySchema } from '@/api/category';

const CategoryContext = createContext<{
  getCategory: (id: string) => CategorySchema | undefined;
  getCategoryPath: (id: string) => CategorySchema[];
}>({
  getCategory: () => undefined,
  getCategoryPath: () => [],
});

export interface CategoryProps extends ComponentPropsWithoutRef<'div'> {
  categoryId: string;
  path?: boolean;
}

export function Category({ categoryId, path, ...props }: CategoryProps) {
  const { getCategory, getCategoryPath } = useContext(CategoryContext);

  const text = useMemo(() => {
    if (path) {
      return getCategoryPath(categoryId)
        .map((c) => c.name)
        .join(' / ');
    }
    return getCategory(categoryId)?.name;
  }, [getCategory, getCategoryPath, categoryId, path]);

  return (
    <div
      {...props}
      className={cx('inline-block p-1 border rounded border-[#6f7c87]', props.className)}
    >
      {text || 'unknown'}
    </div>
  );
}

function createCategoryPathGetter(categories: Record<string, CategorySchema>) {
  const cache: Record<string, CategorySchema[]> = {};

  const get = (id: string): CategorySchema[] => {
    const cached = cache[id];
    if (cached) {
      return cached;
    }

    const category = categories[id];
    if (!category) {
      return [];
    }

    const path = category.parentId ? get(category.parentId).concat(category) : [category];
    cache[id] = path;

    return path;
  };

  return get;
}

export function CategoryProvider({
  children,
  categories,
}: PropsWithChildren<{ categories?: CategorySchema[] }>) {
  const categoryMap = useMemo(() => keyBy(categories, 'id'), [categories]);

  const getCategory = (id: string) => categoryMap[id];

  const getCategoryPath = useMemo(() => createCategoryPathGetter(categoryMap), [categoryMap]);

  return (
    <CategoryContext.Provider value={{ getCategory, getCategoryPath }}>
      {children}
    </CategoryContext.Provider>
  );
}
