import { useMemo } from 'react';

import { useGroups } from 'api/group';
import { Select } from 'components/Select';

const unassignedOption = { key: 'null', text: '未指派' };

export interface GroupSelectProps {
  value?: string[] | null;
  onChange: (value: string[] | null) => void;
}

export function GroupSelect({ value, onChange }: GroupSelectProps) {
  const { data: groups, isLoading } = useGroups();
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

  const handleSelect = (id: string) => {
    if (value) {
      onChange(value.concat(id));
    } else {
      onChange([id]);
    }
  };

  const handleDeselect = (id: string) => {
    if (value) {
      const filtered = value.filter((v) => v !== id);
      if (filtered.length) {
        onChange(filtered);
      } else {
        onChange(null);
      }
    }
  };

  return (
    <Select
      placeholder={isLoading ? 'Loading...' : '任何'}
      options={options}
      selected={value}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
    />
  );
}
