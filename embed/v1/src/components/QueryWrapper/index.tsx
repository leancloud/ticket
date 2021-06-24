import { UseQueryResult } from 'react-query';

import { Loading } from 'components/Loading';
import { APIError } from 'components/APIError';
import { NoData } from 'components/NoData';

export interface QueryWrapperProps<TData, TError> {
  result: UseQueryResult<TData, TError>;
  children: ((data: TData) => JSX.Element) | JSX.Element;
}

export function QueryWrapper<TData, TError>({
  result,
  children,
}: QueryWrapperProps<TData, TError>) {
  if (result.isLoading) {
    return <Loading />;
  }
  if (result.error) {
    return <APIError error={result.error} />;
  }
  if (!result.data) {
    return <NoData />;
  }
  return typeof children === 'function' ? children(result.data) : children;
}
