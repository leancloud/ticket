import { forwardRef, useMemo } from 'react';
import { RefSelectProps } from 'antd/lib/select';

import { useCustomerServices } from '@/api/user';
import { Select, SelectProps } from '@/components/antd';

interface BaseCustomerServiceSelectProps<T = any> extends SelectProps<T> {
  errorMessage?: string;
}

const BaseCustomerServiceSelect = forwardRef<RefSelectProps, BaseCustomerServiceSelectProps>(
  ({ options: extraOptions, errorMessage = '获取客服失败', ...props }, ref) => {
    const { data, isLoading } = useCustomerServices();
    const options = useMemo(() => {
      return [
        ...(extraOptions ?? []),
        ...(data?.map((u) => ({
          label: u.nickname + (!u.active ? '（已禁用）' : ''),
          value: u.id,
        })) ?? []),
      ];
    }, [data, extraOptions]);

    return (
      <Select
        showSearch
        ref={ref}
        optionFilterProp="label"
        loading={isLoading}
        options={options}
        {...props}
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
