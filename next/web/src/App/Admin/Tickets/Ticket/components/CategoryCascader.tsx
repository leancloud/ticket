import { useMemo } from 'react';
import { DefaultOptionType } from 'antd/lib/cascader';
import { groupBy, keyBy, mapValues } from 'lodash-es';

import { useCategories } from '@/api/category';
import { Cascader, CascaderProps } from '@/components/antd';

type CategoryCascaderProps =  CascaderProps<DefaultOptionType> & {
  categoryId?: string;
}

export function CategoryCascader({ categoryId, ...props }: CategoryCascaderProps) {
  const { data: rawCategories, isLoading } = useCategories();

  const categories = useMemo(() => {
    if (!rawCategories) {
      return [];
    }
    return rawCategories.filter((category) => category.active || category.id === categoryId);
  }, [rawCategories, categoryId]);

  const categoriesByParentId = useMemo(() => {
    const map = groupBy(categories, (category) => category.parentId ?? 'root');
    return mapValues(map, (categories) => categories.sort((a, b) => a.position - b.position));
  }, [categories]);

  const options = useMemo(() => {
    const getOptions = (parentId: string): DefaultOptionType[] => {
      const categories = categoriesByParentId[parentId] || [];
      return categories.map((category) => ({
        label: category.name + (category.active ? '' : ' (停用)'),
        value: category.id,
        children: getOptions(category.id),
      }));
    };
    return getOptions('root');
  }, [categoriesByParentId]);

  const categoryById = useMemo(() => keyBy(categories, (c) => c.id), [categories]);

  const value = useMemo(() => {
    const path: string[] = [];
    let currentId = categoryId;
    while (currentId) {
      path.push(currentId);
      currentId = categoryById[currentId]?.parentId;
    }
    return path.reverse();
  }, [categoryById, categoryId]);

  return <Cascader loading={isLoading} options={options} value={value} {...props} />;
}
