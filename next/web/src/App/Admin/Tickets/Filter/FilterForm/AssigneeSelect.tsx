import { useMemo } from 'react';

import { useCustomerServices } from '@/api/user';
import { Select } from '@/components/antd';

const unassignedOption = { label: '未指派', value: 'null' };

export interface AssigneeSelectProps {
  value?: string[] | null;
  onChange: (value: string[] | null) => void;
}

export function AssigneeSelect({ value, onChange }: AssigneeSelectProps) {
  const { data: assignees, isLoading } = useCustomerServices();
  // TODO: handle api error

  const options = useMemo(() => {
    return [
      unassignedOption,
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
      value={value ?? undefined}
      onChange={(value) => onChange(value.length ? value : null)}
    />
  );
}
