import { forwardRef, useMemo } from 'react';
import { RefSelectProps } from 'antd/lib/select';

import { useCustomerServices } from '@/api/user';
import { Select, SelectProps } from '@/components/antd';
import { Retry } from './Retry';

export interface AssigneeSelectProps extends SelectProps<string | string[]> {
  includeUnsetOption?: boolean;
  includeUnsetLabel?: string;
  includeUnsetValue?: string;
  errorMessage?: string;
}

export const AssigneeSelect = forwardRef<RefSelectProps, AssigneeSelectProps>(
  (
    {
      includeUnsetOption = false,
      includeUnsetLabel = '(未设置)',
      includeUnsetValue = '',
      errorMessage = '获取负责人失败',
      ...props
    },
    ref
  ) => {
    const { data, isLoading, error, refetch } = useCustomerServices();
    const options = useMemo(() => {
      if (data) {
        const options = data.map((u) => ({ label: u.nickname, value: u.id }));
        if (includeUnsetOption) {
          options.unshift({ label: includeUnsetLabel, value: includeUnsetValue });
        }
        return options;
      }
    }, [data, includeUnsetOption, includeUnsetLabel, includeUnsetValue]);

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
