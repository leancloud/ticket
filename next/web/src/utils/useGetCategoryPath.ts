import { useCallback, useEffect, useRef } from 'react';

import { CategorySchema } from '@/api/category';

export function useGetCategoryPath(categories?: CategorySchema[]) {
  const $cache = useRef<Record<string, CategorySchema[]>>({});

  useEffect(() => {
    $cache.current = {};
  }, [categories]);

  const get = useCallback(
    (id: string) => {
      const cached = $cache.current[id];
      if (cached) {
        return cached;
      }

      if (!categories) {
        return [];
      }

      const target = categories.find((c) => c.id === id);
      if (!target) {
        return [];
      }

      const path: CategorySchema[] = target.parentId
        ? get(target.parentId).concat(target)
        : [target];
      $cache.current[id] = path;
      return path;
    },
    [categories]
  );

  return get;
}
