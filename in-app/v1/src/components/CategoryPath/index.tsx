import { ComponentPropsWithoutRef, useMemo } from 'react';
import cx from 'classnames';
import { Category, useCategories } from '@/api/category';

export interface CategoryPathProps extends ComponentPropsWithoutRef<'span'> {
  path: string[];
}

function CategoryPathImpl({ path, ...props }: CategoryPathProps) {
  return <span {...props}>{path.join(' / ')}</span>;
}

function makeCategoryPathGetter(categories: Category[]) {
  const paths: Record<string, string[]> = {};
  const get = (id: string): string[] => {
    const cached = paths[id];
    if (cached) {
      return cached;
    }

    const category = categories.find((c) => c.id === id);
    if (!category) {
      return [];
    }

    if (category.parentId) {
      const path = [...get(category.parentId), category.name];
      paths[id] = path;
      return path;
    } else {
      const path = [category.name];
      paths[id] = path;
      return path;
    }
  };
  return get;
}

export function useGetCategoryPath() {
  const { data: categories } = useCategories();
  return useMemo(() => makeCategoryPathGetter(categories ?? []), [categories]);
}

export const CategoryPath = ({
  categoryId,
  ...props
}: { categoryId: string } & ComponentPropsWithoutRef<'span'>) => {
  const getter = useGetCategoryPath();

  return <CategoryPathImpl path={getter(categoryId)} {...props} />;
};
