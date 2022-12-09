import { ComponentPropsWithoutRef, useMemo } from 'react';
import cx from 'classnames';
import { CategorySchema, useCategories } from '@/api/category';

export interface CategoryPathProps extends ComponentPropsWithoutRef<'span'> {
  path: string[];
}

export function CategoryPath({ path, ...props }: CategoryPathProps) {
  return (
    <span {...props} className={cx('p-1 border rounded border-[#6f7c87]', props.className)}>
      {path.join(' / ')}
    </span>
  );
}
function makeCategoryPathGetter(categories: CategorySchema[]) {
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
