import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { last, noop, keyBy } from 'lodash-es';

import { CategorySchema, useCategories } from 'api/category';
import { Select } from 'components/Select';

const CategorySelectContext = createContext<{
  categories: CategorySchema[];
  getValue: (depth: number) => string | undefined;
  setValue: (depth: number, value?: string) => void;
}>({
  categories: [],
  getValue: noop as any,
  setValue: noop,
});

const anyCategoryOption = { key: '', text: '任何' };

interface SubCategorySelectProps {
  parentId?: string;
  depth: number;
}

function SubCategorySelect({ parentId, depth }: SubCategorySelectProps) {
  const { categories, getValue, setValue } = useContext(CategorySelectContext);
  const value = getValue(depth);

  const currentLevel = useMemo(() => {
    return categories
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.position - b.position);
  }, [categories, parentId]);

  const options = useMemo(() => {
    return [anyCategoryOption].concat(
      currentLevel.map((c) => ({
        key: c.id,
        text: c.name + (c.active ? '' : '（停用）'),
      }))
    );
  }, [currentLevel]);

  if (currentLevel.length === 0) {
    return null;
  }
  return (
    <>
      <Select
        closeOnChange
        options={options}
        selected={value ?? anyCategoryOption.key}
        onSelect={(key) => setValue(depth, key || undefined)}
      />
      {value && <SubCategorySelect parentId={value} depth={depth + 1} />}
    </>
  );
}

export interface CategorySelectProps {
  value?: string;
  onChange: (value?: string) => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const { data: categories, isLoading } = useCategories();
  const [values, setValues] = useState<string[]>([]);

  const setValue = (depth: number, value?: string) => {
    const next = values.slice(0, depth);
    if (value) {
      next.push(value);
    }
    setValues(next);
    onChange(last(next));
  };

  const getValue = (depth: number) => {
    if (values.length > depth) {
      return values[depth];
    }
  };

  const categoryById = useMemo(() => {
    return keyBy(categories, (c) => c.id);
  }, [categories]);

  useEffect(() => {
    if (value) {
      let p = categoryById[value];
      if (p) {
        const values: string[] = [];
        while (p) {
          values.unshift(p.id);
          if (!p.parentId) {
            break;
          }
          p = categoryById[p.parentId];
        }
        setValues(values);
      }
    }
  }, [categoryById, value]);

  if (isLoading || !categories) {
    return <Select placeholder="Loading..." />;
  }
  return (
    <CategorySelectContext.Provider value={{ categories, getValue, setValue }}>
      <div className="flex flex-col gap-1.5">
        <SubCategorySelect depth={0} />
      </div>
    </CategorySelectContext.Provider>
  );
}
