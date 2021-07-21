import { useEffect, useRef } from 'react';

export function useIsMounted() {
  const $mounted = useRef(false);
  const $test = useRef(() => $mounted.current);
  useEffect(() => {
    $mounted.current = true;
    return () => {
      $mounted.current = false;
    };
  }, []);
  return $test.current;
}
