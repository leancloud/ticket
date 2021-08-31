import { useMemo } from 'react';

import { useGroups } from 'api/group';
import { Select } from 'components/Select';

export interface GroupSelectProps {
  value?: string;
  onChange: (value?: string) => void;
  open?: boolean;
}

export function GroupSelect({ value, onChange, open }: GroupSelectProps) {
  const { data: groups, isLoading } = useGroups({
    enabled: !!open,
  });

  const options = useMemo(() => {
    if (groups) {
      return [{ key: '', text: '--' }, ...groups.map((g) => ({ key: g.id, text: g.name }))];
    }
  }, [groups]);

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
