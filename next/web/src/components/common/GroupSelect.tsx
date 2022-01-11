import { forwardRef, useMemo } from 'react';
import { RefSelectProps } from 'antd/lib/select';

import { useGroups } from '@/api/group';
import { Select, SelectProps } from '@/components/antd';
import { Retry } from './Retry';

export interface GroupSelectProps extends SelectProps<string | string[]> {
  errorMessage?: string;
}

export const GroupSelect = forwardRef<RefSelectProps, GroupSelectProps>(
  ({ options: extraOptions, errorMessage = '获取客服组失败', ...props }, ref) => {
    const { data, isLoading, error, refetch } = useGroups();
    const options = useMemo(() => {
      return [
        ...(extraOptions ?? []),
        ...(data?.map((g) => ({ label: g.name, value: g.id })) ?? []),
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
