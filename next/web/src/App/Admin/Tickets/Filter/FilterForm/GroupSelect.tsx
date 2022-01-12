import { useMemo } from 'react';

import { useGroups } from '@/api/group';
import { Select } from '@/components/antd';

export interface GroupSelectProps {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
}

export function GroupSelect({ value, onChange }: GroupSelectProps) {
  const { data: groups, isLoading } = useGroups();

  const options = useMemo(() => {
    return [
      { label: '未指派', value: 'null' },
      ...(groups ?? []).map((g) => ({ label: g.name, value: g.id })),
    ];
  }, [groups]);

  return (
    <Select
      className="w-full"
      mode="multiple"
      showArrow
      placeholder={isLoading ? 'Loading...' : '任何'}
      loading={isLoading}
      options={options}
      optionFilterProp="label"
      value={value ?? undefined}
      onChange={(value) => onChange(value.length ? value : undefined)}
    />
  );
}
