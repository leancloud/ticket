import { forwardRef, useCallback, useMemo } from 'react';
import { CascaderRef } from 'antd/lib/cascader';

import { CategoryTreeNode, useCategories, useCategoryTree } from '@/api/category';
import { Cascader, CascaderProps } from '@/components/antd';
import { Retry } from './Retry';

function findCategory(tree: CategoryTreeNode[], id: string): CategoryTreeNode | undefined {
  const queue = tree.slice();
  while (queue.length) {
    const front = queue.shift()!;
    if (front.id === id) {
      return front;
    }
    front.children?.forEach((c) => queue.push(c));
  }
}

function getCategoryIdPath(category: CategoryTreeNode): string[] {
  const path = [category.id];
  while (category.parent) {
    category = category.parent;
    path.push(category.id);
  }
  return path.reverse();
}

export interface CategorySelectProps
  extends Omit<CascaderProps<CategoryTreeNode>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (id?: string, categoryPath?: CategoryTreeNode[]) => void;
  errorMessage?: string;
  categoryActive?: boolean;
}

export const CategorySelect = forwardRef<CascaderRef, CategorySelectProps>(
  ({ errorMessage = '获取分类失败', value, onChange, categoryActive, ...props }, ref) => {
    const { data, isLoading, error, refetch } = useCategories({
      active: categoryActive,
    });
    const categoryTree = useCategoryTree(data);

    const path = useMemo(() => {
      if (!data || !value) {
        return [];
      }
      const category = findCategory(data, value);
      if (!category) {
        return [value];
      }
      return getCategoryIdPath(category);
    }, [data, value]);

    const handleChange = useCallback(
      (ids?: string[], categoryPath?: CategoryTreeNode[]) => {
        if (onChange) {
          const id = ids?.length ? ids[ids.length - 1] : undefined;
          onChange(id, categoryPath);
        }
      },
      [onChange]
    );

    if (error) {
      return <Retry error={error} message={errorMessage} onRetry={refetch} />;
    }

    return (
      <Cascader
        {...props}
        ref={ref}
        loading={isLoading}
        options={categoryTree as any}
        fieldNames={{ label: 'name', value: 'id' }}
        value={path}
        onChange={handleChange as any}
      />
    );
  }
);
