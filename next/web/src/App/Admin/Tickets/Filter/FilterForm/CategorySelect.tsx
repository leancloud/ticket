import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { last, noop, keyBy } from 'lodash-es';

import { CategorySchema, useCategories } from '@/api/category';
import { Select } from '@/components/antd';

const anyCategoryOption = { label: '任何', value: '' };

const CategorySelectContext = createContext<{
  categories: CategorySchema[];
  getValue: (depth: number) => string | undefined;
  setValue: (depth: number, value?: string) => void;
}>({
  categories: [],
  getValue: noop as any,
  setValue: noop,
});

interface SubCategorySelectProps {
  parentId?: string;
  depth: number;
  disabled?: boolean;
}

function SubCategorySelect({ parentId, depth, disabled }: SubCategorySelectProps) {
  const { categories, getValue, setValue } = useContext(CategorySelectContext);
  const value = getValue(depth);

  const currentLevel = useMemo(() => {
    return categories
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.position - b.position);
  }, [categories, parentId]);

  const options = useMemo(() => {
    return [
      anyCategoryOption,
      ...currentLevel.map((c) => ({
        label: `${c.name}${c.active ? '' : '（停用）'}`,
        value: c.id,
      })),
    ];
  }, [currentLevel]);

  if (currentLevel.length === 0) {
    return null;
  }
  return (
    <>
      <Select
        options={options}
        value={value ?? anyCategoryOption.value}
        onChange={(key) => setValue(depth, key || undefined)}
        disabled={disabled}
      />
      {value && <SubCategorySelect parentId={value} depth={depth + 1} disabled={disabled} />}
    </>
  );
}

export interface CategorySelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}

export function CategorySelect({ value, onChange, disabled }: CategorySelectProps) {
  const { data: categories } = useCategories();
  const categoryById = useMemo(() => keyBy(categories, (c) => c.id), [categories]);
  const [values, setValues] = useState<string[]>([]);

  useEffect(() => {
    if (!value) {
      setValues([]);
      return;
    }
    const values: string[] = [];
    let category = categoryById[value];
    while (category) {
      values.push(category.id);
      if (!category.parentId) {
        break;
      }
      category = categoryById[category.parentId];
    }
    setValues(values.reverse());
  }, [categoryById, value]);

  const setValue = (depth: number, value?: string) => {
    const next = values.slice(0, depth);
    if (value) {
      next.push(value);
    }
    setValues(next);
    onChange(last(next) ?? undefined);
  };

  const getValue = (depth: number) => {
    if (values.length > depth) {
      return values[depth];
    }
  };

  if (!categories) {
    return <Select loading placeholder="Loading..." disabled={disabled} />;
  }
  return (
    <CategorySelectContext.Provider value={{ categories, getValue, setValue }}>
      <div className="flex flex-col gap-1.5">
        <SubCategorySelect depth={0} disabled={disabled} />
      </div>
    </CategorySelectContext.Provider>
  );
}
