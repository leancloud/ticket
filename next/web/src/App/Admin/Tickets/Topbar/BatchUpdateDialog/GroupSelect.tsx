import { useMemo } from 'react';

import { useGroups } from '@/api/group';
import { Select } from '@/components/antd';

export interface GroupSelectProps {
  value?: string;
  onChange: (value?: string) => void;
}

export function GroupSelect({ value, onChange }: GroupSelectProps) {
  const { data: groups, isLoading } = useGroups();

  const options = useMemo(() => {
    return [
      { label: '--', value: '' },
      ...(groups ?? []).map((g) => ({ label: g.name, value: g.id })),
    ];
  }, [groups]);

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
