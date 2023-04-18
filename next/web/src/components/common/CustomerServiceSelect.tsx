import { forwardRef, useMemo } from 'react';
import { RefSelectProps } from 'antd/lib/select';

import { useCustomerServices } from '@/api/user';
import { Select, SelectProps } from '@/components/antd';
import { Retry } from './Retry';

export interface BaseCustomerServiceSelectProps<T = any> extends SelectProps<T> {
  errorMessage?: string;
}

export const BaseCustomerServiceSelect = forwardRef<RefSelectProps, BaseCustomerServiceSelectProps>(
  ({ options: extraOptions, errorMessage = '获取客服失败', ...props }, ref) => {
    const { data, isLoading, error, refetch } = useCustomerServices();
    const options = useMemo(() => {
      return [
        ...(extraOptions ?? []),
        ...(data?.map((u) => ({
          label: u.nickname + (!u.active ? '（已禁用）' : ''),
          value: u.id,
        })) ?? []),
      ];
    }, [data, extraOptions]);

    if (error) {
      return <Retry error={error} message={errorMessage} onRetry={refetch} />;
    }

    return (
      <Select
        showSearch
        optionFilterProp="label"
        {...props}
        ref={ref}
        loading={isLoading}
        options={options}
      />
    );
  }
);

export interface CustomerServiceSelectProps
  extends BaseCustomerServiceSelectProps<string | string[]> {}

export const CustomerServiceSelect = forwardRef<RefSelectProps, CustomerServiceSelectProps>(
  (props, ref) => {
    return <BaseCustomerServiceSelect {...props} ref={ref} />;
  }
);
