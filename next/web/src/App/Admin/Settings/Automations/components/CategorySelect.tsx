import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { CascaderRef } from 'antd/lib/cascader';

import { Cascader } from '@/components/antd';
import { CategoryTreeNode, useCategories, useCategoryTree } from '@/api/category';

const FIELD_NAMES = { label: 'name', value: 'id' };

function findCategory(categoryTree: CategoryTreeNode[], id: string): CategoryTreeNode | undefined {
  const queue = categoryTree.slice();
  for (;;) {
    const front = queue.shift();
    if (!front) {
      break;
    }
    if (front.id === id) {
      return front;
    }
    if (front.children) {
      front.children.forEach((c) => queue.push(c));
    }
  }
}

function getCategoryIdPath(category: CategoryTreeNode): string[] {
  const path: string[] = [category.id];
  for (;;) {
    if (!category.parent) {
      break;
    }
    category = category.parent;
    path.push(category.id);
  }
  return path.reverse();
}

export interface CategorySelectProps {
  initValue?: string;
  onChange: (id: string) => void;
}

export const CategorySelect = forwardRef<CascaderRef, CategorySelectProps>(
  ({ initValue, onChange }, ref) => {
    const $initValue = useRef(initValue);
    const [path, setPath] = useState<string[]>();
    const { data } = useCategories();
    const categoryTree = useCategoryTree(data);

    useEffect(() => {
      if (categoryTree && $initValue.current) {
        const target = findCategory(categoryTree, $initValue.current);
        if (target) {
          setPath(getCategoryIdPath(target));
        }
        $initValue.current = undefined;
      }
    }, [categoryTree]);

    const handleChange = useCallback(
      (path: string[]) => {
        setPath(path);
        onChange(path[path.length - 1]);
      },
      [onChange]
    );

    return (
      <Cascader
        ref={ref}
        showSearch
        options={categoryTree as any}
        fieldNames={FIELD_NAMES}
        value={path}
        onChange={handleChange as any}
        style={{ width: 260 }}
      />
    );
  }
);
