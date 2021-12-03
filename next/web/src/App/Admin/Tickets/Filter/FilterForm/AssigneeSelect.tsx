import { useMemo } from 'react';

import { useCustomerServices } from '@/api/user';
import { Select } from '@/components/antd';

export interface AssigneeSelectProps {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
}

export function AssigneeSelect({ value, onChange }: AssigneeSelectProps) {
  const { data: assignees, isLoading } = useCustomerServices();

  const options = useMemo(() => {
    return [
      { label: '未指派', value: '' },
      ...(assignees ?? []).map((a) => ({ label: a.nickname, value: a.id })),
    ];
  }, [assignees]);

  return (
    <Select
      className="w-full"
      mode="multiple"
      showArrow
      placeholder={isLoading ? 'Loading...' : '任何'}
      loading={isLoading}
      options={options}
      optionFilterProp="label"
      value={value}
      onChange={(v) => onChange(v.length ? v : undefined)}
    />
  );
}
