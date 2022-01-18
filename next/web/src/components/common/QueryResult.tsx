import { UseQueryResult } from 'react-query';

import { Spin } from '@/components/antd';
import { Retry } from './Retry';

interface ResultCoverProps<T> {
  result: UseQueryResult<T, Error>;
  errorMessage?: string;
  children: ((result: UseQueryResult<T, Error> & { data: T }) => JSX.Element) | JSX.Element;
}

function ResultCover<T>({ result, errorMessage, children }: ResultCoverProps<T>) {
  if (result.isLoading || result.isFetching) {
    return (
      <div className="h-full min-h-[400px] flex justify-center items-center">
        <Spin />
      </div>
    );
  }

  if (result.error) {
    return (
      <Retry
        message={errorMessage || 'Something went wrong'}
        error={result.error}
        onRetry={result.refetch}
      />
    );
  }

  if (typeof children === 'function') {
    return children(result as any);
  }
  return children;
}

export interface QueryResultProps<T> extends ResultCoverProps<T> {
  className?: string;
}

export function QueryResult<T>({ className, ...props }: QueryResultProps<T>) {
  return (
    <div className={className}>
      <ResultCover {...props} />
    </div>
  );
}
