import { ReactNode } from 'react';

export interface QueryResultProps<T, E> {
  result: {
    data?: T;
    error: E | null;
    isLoading: boolean;
  };
  children: ((data: T) => ReactNode) | ReactNode;
  placeholder?: ReactNode;
}

export function QueryResult<T = unknown, E extends Error = Error>({
  result,
  children,
  placeholder = 'Loading...',
}: QueryResultProps<T, E>) {
  if (result.isLoading) {
    return placeholder;
  }
  if (result.error) {
    return <div className="text-red-600">{result.error.message}</div>;
  }
  return typeof children === 'function' ? children(result.data!) : children;
}
