import { useMemo } from 'react';

import { useCustomerServices } from 'api/user';
import { Select } from 'components/Select';

export interface AssigneeSelectProps {
  value?: string;
  onChange: (value?: string) => void;
  open?: boolean;
}

export function AssigneeSelect({ value, onChange, open }: AssigneeSelectProps) {
  const { data: assignees, isLoading } = useCustomerServices({
    enabled: !!open,
  });

  const options = useMemo(() => {
    if (assignees) {
      return [{ key: '', text: '--' }, ...assignees.map((a) => ({ key: a.id, text: a.nickname }))];
    }
  }, [assignees]);

  return (
    <Select
      closeOnChange
      options={options}
      placeholder={isLoading ? 'Loading...' : undefined}
      selected={value ?? ''}
      onSelect={(id) => onChange(id || undefined)}
    />
  );
}
