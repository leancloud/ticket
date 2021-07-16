import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export function useSearchParams(): Record<string, string> {
  const { search } = useLocation();
  const params = useMemo(() => {
    const params = new URLSearchParams(search);
    return Array.from(params.entries()).reduce((map, [key, value]) => {
      map[key] = value;
      return map;
    }, {} as Record<string, string>);
  }, [search]);
  return params;
}
