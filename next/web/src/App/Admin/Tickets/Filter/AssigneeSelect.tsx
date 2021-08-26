import { useMemo } from 'react';

import { useCustomerServices } from 'api/user';
import { Select } from 'components/Select';

const unassignedOption = { key: 'null', text: '未指派' };

export interface AssigneeSelectProps {
  value?: string[];
  onChange: (value: string[]) => void;
}

export function AssigneeSelect({ value, onChange }: AssigneeSelectProps) {
  const { data: assignees, isLoading } = useCustomerServices({
    cacheTime: Infinity,
    staleTime: Infinity,
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
