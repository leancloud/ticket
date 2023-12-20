import { useCallback, useMemo, useRef } from 'react';
import { localStorage } from '@/env';

const STORAGE_KEY = 'TapDesk/formData';

interface FormData {
  categoryId: string;
  data: Record<string, any>;
}

function persistFormData(data: FormData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFormData(): FormData | undefined {
  const encoded = localStorage.getItem(STORAGE_KEY);
  if (encoded) {
    return JSON.parse(encoded);
  }
}
function clearFormData() {
  localStorage.removeItem(STORAGE_KEY);
}

export function usePersistFormData(categoryId: string) {
  const $timerId = useRef<number | undefined>();

  const initData = useMemo(() => {
    const data = loadFormData();
    if (data && data.categoryId === categoryId) {
      return data.data;
    }
  }, [categoryId]);

  const onChange = useCallback(
    (data: FormData['data']) => {
      clearTimeout($timerId.current);
      $timerId.current = setTimeout(() => {
        persistFormData({ categoryId, data });
      }, 100) as any;
    },
    [categoryId]
  );

  return { initData, onChange, clear: clearFormData };
}
