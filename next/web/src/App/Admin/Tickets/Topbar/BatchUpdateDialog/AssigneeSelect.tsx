import { useMemo } from 'react';

import { useCustomerServices } from '@/api/user';
import { Select } from '@/components/antd';

export interface AssigneeSelectProps {
  value?: string;
  onChange: (value?: string) => void;
}

export function AssigneeSelect({ value, onChange }: AssigneeSelectProps) {
  const { data: assignees, isLoading } = useCustomerServices();

  const options = useMemo(() => {
    return [
      { label: '--', value: '' },
      ...(assignees ?? []).map((a) => ({ label: a.nickname, value: a.id })),
    ];
  }, [assignees]);

  return (
    <Select
      className="w-full"
      getPopupContainer={() => document.getElementById('batchUpdateForm')!}
      options={options}
      placeholder={isLoading ? 'Loading...' : undefined}
      loading={isLoading}
      value={value ?? ''}
      onChange={(id) => onChange(id || undefined)}
    />
  );
}
