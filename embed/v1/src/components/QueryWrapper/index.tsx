import { ReactNode } from 'react';
import { UseQueryResult } from 'react-query';

import { Loading } from 'components/Loading';
import { APIError } from 'components/APIError';
import { NoData } from 'components/NoData';

export interface QueryWrapperProps<TData, TError> {
  result: UseQueryResult<TData, TError>;
  noData?: boolean;
  noDataMessage?: string;
  children: ((data: TData) => ReactNode) | ReactNode;
}

export function QueryWrapper<TData, TError>({
  result,
  noData,
  noDataMessage,
  children,
}: QueryWrapperProps<TData, TError>) {
  if (result.isLoading) {
    return <Loading />;
  }
  if (result.error) {
    return <APIError error={result.error} />;
  }
  if (!result.data || noData) {
    return <NoData message={noDataMessage} />;
  }
  return typeof children === 'function' ? children(result.data) : children;
}
