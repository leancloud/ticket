import { ReactNode } from 'react';
import { UseQueryResult } from 'react-query';
import axios from 'axios';

import { Loading } from '@/components/Loading';
import { APIError } from '@/components/APIError';
import { NoData } from '@/components/NoData';
import NotFound from '../../App/NotFound';

export interface QueryWrapperProps<TData, TError> {
  result: UseQueryResult<TData, TError>;
  noData?: boolean;
  noDataMessage?: string | ReactNode;
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
    if (axios.isAxiosError(result.error) && result.error.response?.status === 404) {
      return <NotFound />;
    }
    return <APIError onRetry={result.refetch} />;
  }
  if (!result.data || noData) {
    return <NoData message={noDataMessage} />;
  }
  return typeof children === 'function' ? children(result.data) : children;
}
