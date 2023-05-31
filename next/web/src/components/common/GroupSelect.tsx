import { forwardRef, useMemo } from 'react';
import { RefSelectProps } from 'antd/lib/select';

import { useGroups } from '@/api/group';
import { Select, SelectProps } from '@/components/antd';
import { Retry } from './Retry';

export interface BaseGroupSelectProps<T = any> extends SelectProps {
  errorMessage?: string;
}

export const BaseGroupSelect = forwardRef<RefSelectProps, BaseGroupSelectProps>(
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

export interface GroupSelectProps extends BaseGroupSelectProps<string | string[]> {}

export const GroupSelect = forwardRef<RefSelectProps, GroupSelectProps>((props, ref) => {
  return <BaseGroupSelect {...props} ref={ref} />;
});
