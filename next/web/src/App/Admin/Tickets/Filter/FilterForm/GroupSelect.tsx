import { useMemo } from 'react';

import { useGroups } from '@/api/group';
import { Select } from '@/components/antd';

const unassignedOption = { label: '未指派', value: 'null' };

export interface GroupSelectProps {
  value?: string[] | null;
  onChange: (value: string[] | null) => void;
}

export function GroupSelect({ value, onChange }: GroupSelectProps) {
  const { data: groups, isLoading } = useGroups();
  // TODO: handle api error

  const options = useMemo(() => {
    return [unassignedOption, ...(groups ?? []).map((g) => ({ label: g.name, value: g.id }))];
  }, [groups]);

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
