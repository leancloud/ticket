import { useMemo } from 'react';
import { keyBy } from 'lodash-es';

import { CategorySchema, useCategories } from '@/api/category';
import { Select } from '@/components/antd';

interface SubCategorySelectProps {
  categories: CategorySchema[];
  parentId?: string;
  depth: number;
  path: string[];
  onChange: (value: string | undefined) => void;
}

function SubCategorySelect({
  categories,
  parentId,
  depth,
  path,
  onChange,
}: SubCategorySelectProps) {
  const options = useMemo(() => {
    return [
      { label: '-- ', value: '' },
      ...categories
        .filter((c) => c.parentId === parentId)
        .map((c) => ({ label: c.name, value: c.id })),
    ];
  }, [categories, parentId, depth]);

  const value = path[depth];

  if (options.length === 1) {
    return null;
  }
  return (
    <>
      <Select
        getPopupContainer={() => document.getElementById('batchUpdateForm')!}
        options={options}
        value={value ?? ''}
        onChange={(id) => onChange(id || path[depth - 1])}
      />
      {value && (
        <SubCategorySelect
          categories={categories}
          parentId={value}
          depth={depth + 1}
          path={path}
          onChange={(id) => onChange(id || value)}
        />
      )}
    </>
  );
}

export interface CategorySelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const { data: categories, isLoading } = useCategories();

  const activeCategories = useMemo(() => {
    if (!categories) {
      return [];
    }
    return categories.filter((c) => c.active);
  }, [categories]);

  const categoryMap = useMemo(() => keyBy(activeCategories, (c) => c.id), [activeCategories]);

  const path = useMemo(() => {
    const path: string[] = [];
    if (value) {
      let category = categoryMap[value];
      while (category) {
        path.push(category.id);
        if (!category.parentId) {
          break;
        }
        category = categoryMap[category.parentId];
      }
    }
    return path.reverse();
  }, [categoryMap, value]);

  if (isLoading) {
    return <Select loading placeholder="Loading..." />;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <SubCategorySelect categories={activeCategories} path={path} onChange={onChange} depth={0} />
    </div>
  );
}
