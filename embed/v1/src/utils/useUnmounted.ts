import { useEffect, useRef } from 'react';

export function useUnmounted() {
  const $unmounted = useRef(false);
  useEffect(
    () => () => {
      $unmounted.current = true;
    },
    []
  );
  return $unmounted.current;
}
