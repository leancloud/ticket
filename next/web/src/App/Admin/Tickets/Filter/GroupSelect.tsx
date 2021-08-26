import { useMemo } from 'react';

import { useGroups } from 'api/group';
import { Select } from 'components/Select';

const unassignedOption = { key: 'null', text: '未指派' };

export interface GroupSelectProps {
  value?: string[];
  onChange: (value: string[]) => void;
}

export function GroupSelect({ value, onChange }: GroupSelectProps) {
  const { data: groups, isLoading } = useGroups({
    staleTime: Infinity,
    cacheTime: Infinity,
  });
  // TODO: handle api error

  const options = useMemo(() => {
    if (groups) {
      return [unassignedOption].concat(
        groups.map((g) => ({
          key: g.id,
          text: g.name,
        }))
      );
    }
  }, [groups]);

  return (
    <Select
      placeholder={isLoading ? 'Loading...' : '任何'}
      options={options}
      selected={value}
      onSelect={(key) => onChange(value ? value.concat(key) : [key])}
      onDeselect={(key) => value && onChange(value.filter((k) => k !== key))}
    />
  );
}
