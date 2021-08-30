import { useMemo } from 'react';

import { useCustomerServices } from 'api/user';
import { Select } from 'components/Select';

const unassignedOption = { key: 'null', text: '未指派' };

export interface AssigneeSelectProps {
  value?: string[] | null;
  onChange: (value: string[] | null) => void;
}

export function AssigneeSelect({ value, onChange }: AssigneeSelectProps) {
  const { data: assignees, isLoading } = useCustomerServices({
    cacheTime: Infinity,
  });
  // TODO: handle api error

  const options = useMemo(() => {
    if (assignees) {
      return [unassignedOption].concat(
        assignees.map((a) => ({
          key: a.id,
          text: a.nickname,
        }))
      );
    }
  }, [assignees]);

  const handleSelect = (id: string) => {
    if (value) {
      onChange(value.concat(id));
    } else {
      onChange([id]);
    }
  };

  const handleDeselete = (id: string) => {
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
      onDeselect={handleDeselete}
    />
  );
}
