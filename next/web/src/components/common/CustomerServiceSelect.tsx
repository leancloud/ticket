import { forwardRef, useMemo } from 'react';
import { RefSelectProps } from 'antd/lib/select';

import { useCustomerServices } from '@/api/user';
import { Select, SelectProps } from '@/components/antd';
import { Retry } from './Retry';

export interface CustomerServiceSelectProps extends SelectProps<string | string[]> {
  errorMessage?: string;
}

export const CustomerServiceSelect = forwardRef<RefSelectProps, CustomerServiceSelectProps>(
  ({ options: extraOptions, errorMessage = '获取客服失败', ...props }, ref) => {
    const { data, isLoading, error, refetch } = useCustomerServices();
    const options = useMemo(() => {
      return [
        ...(extraOptions ?? []),
        ...(data?.map((u) => ({ label: u.nickname, value: u.id })) ?? []),
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
