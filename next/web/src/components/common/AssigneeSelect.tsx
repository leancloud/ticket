import { forwardRef, useMemo } from 'react';
import { RefSelectProps } from 'antd/lib/select';

import { useCustomerServices } from '@/api/user';
import { Select, SelectProps } from '@/components/antd';
import { Retry } from './Retry';

export interface AssigneeSelectProps extends SelectProps<string | string[]> {
  includeUnset?: boolean;
  unsetLabel?: string;
  unsetValue?: string;
  errorMessage?: string;
}

export const AssigneeSelect = forwardRef<RefSelectProps, AssigneeSelectProps>(
  (
    {
      includeUnset,
      unsetLabel = '(未设置)',
      unsetValue = '',
      errorMessage = '获取负责人失败',
      ...props
    },
    ref
  ) => {
    const { data, isLoading, error, refetch } = useCustomerServices();
    const options = useMemo(() => {
      if (data) {
        const options = data.map((u) => ({ label: u.nickname, value: u.id }));
        if (includeUnset) {
          options.unshift({ label: unsetLabel, value: unsetValue });
        }
        return options;
      }
    }, [data, includeUnset, unsetLabel, unsetValue]);

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
