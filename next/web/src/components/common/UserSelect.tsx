import { forwardRef, useMemo, useState } from 'react';
import { useDebounce } from 'react-use';
import { RefSelectProps } from 'antd/lib/select';

import { useSearchUser } from '@/api/user';
import { Select, SelectProps, Spin } from '@/components/antd';
import { Retry } from './Retry';

export interface UserSelectProps extends SelectProps<string | string[]> {
  errorMessage?: string;
}

export const UserSelect = forwardRef<RefSelectProps, UserSelectProps>(
  ({ options: extraOptions, errorMessage = '获取用户失败', ...props }, ref) => {
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);
    useDebounce(() => setDebouncedKeyword(keyword), 500, [keyword]);

    const q = useMemo(() => debouncedKeyword.trim(), [debouncedKeyword]);
    const { data, isLoading, error, refetch } = useSearchUser(q, {
      enabled: q !== '',
    });

    const options = useMemo(() => {
      return [
        ...(extraOptions ?? []),
        ...(data?.map((u) => ({
          label: `${u.nickname}${u.email ? ` (${u.email})` : ''}`,
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
        filterOption={false}
        onSearch={setKeyword}
        notFoundContent={isLoading ? <Spin size="small" /> : undefined}
        placeholder="使用用户名或邮箱搜索"
        {...props}
        ref={ref}
        loading={isLoading}
        options={options}
      />
    );
  }
);
