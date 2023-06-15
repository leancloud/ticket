import { useRef } from 'react';

export function useCurrentRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
